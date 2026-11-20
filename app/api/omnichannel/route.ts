import { NextResponse } from 'next/server';
import {
  getOmnichannelOverviewSnapshot,
  reserveOrderStock,
  executeSplitShipment,
  suggestSubstituteProduct,
  applySubstituteInOrder,
  backorderRemainingLines,
  processRmaDisposition,
  syncAllSalesChannels,
  createGibEDocument,
  seedRealisticOmnichannelData
} from '@/lib/services/omnichannelServerDb';
import { mockDatabase } from '@/lib/data/mockDatabase';
import { isDemoEnvironment } from '@/lib/config/production-feature-flags';
import { requirePermission } from '@/lib/auth/server-permission';
import { getLogisticsScopeContext } from '@/lib/logistics/security';
import { checkRateLimit, resolveRequestClientIp } from '@/lib/security/rateLimiter';
import {
  FAZ4_GET_SECTIONS,
  FAZ4_POST_ACTIONS,
  handleReturnsExtendedGet,
  handleReturnsExtendedPost,
} from '@/lib/logistics/returns/apiHandlers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    if (section && FAZ4_GET_SECTIONS.has(section)) {
      return handleReturnsExtendedGet(request);
    }

    const demoMode = isDemoEnvironment();
    if (!demoMode) {
      const omniAuth = await requirePermission('omnichannel', 'read');
      let authPayload = omniAuth instanceof NextResponse ? null : omniAuth.payload;
      if (omniAuth instanceof NextResponse) {
        if (omniAuth.status !== 403) return omniAuth;
        const altAuth = await requirePermission('lojistik_iade', 'read');
        if (altAuth instanceof NextResponse) return omniAuth;
        authPayload = altAuth.payload;
      }
      if (authPayload) {
        const scope = await getLogisticsScopeContext(authPayload, authPayload.branchId);
        if (scope.isSupplierScoped) {
          return NextResponse.json(
            {
              success: false,
              code: 'FORBIDDEN_SUPPLIER_SCOPE',
              error: 'Tedarikçi portal oturumu ile şirket içi sipariş ve iade verilerine erişilemez.',
            },
            { status: 403 }
          );
        }
      }
    }

    const data = await getOmnichannelOverviewSnapshot();
    if ((!data.orders || data.orders.length === 0) && demoMode) {
      return NextResponse.json(mockDatabase.getOmnichannelOverview());
    }
    return NextResponse.json(data);
  } catch (error: any) {
    if (isDemoEnvironment()) {
      console.warn("GET /api/omnichannel fallback to mockDatabase:", error);
      return NextResponse.json(mockDatabase.getOmnichannelOverview());
    }
    return NextResponse.json(
      { success: false, error: 'Omnichannel verileri alınamadı.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = resolveRequestClientIp(request.headers);
    const rl = checkRateLimit(`omnichannel-post:${ip}`, 120, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Çok fazla istek gönderildi.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action && FAZ4_POST_ACTIONS.has(action)) {
      return handleReturnsExtendedPost(body);
    }

    const auth = await requirePermission('omnichannel', 'update');
    let authPayload = auth instanceof NextResponse ? null : auth.payload;
    if (auth instanceof NextResponse) {
      if (auth.status !== 403) return auth;
      const altAuth = await requirePermission('lojistik_iade', 'update');
      if (altAuth instanceof NextResponse) return auth;
      authPayload = altAuth.payload;
    }
    if (authPayload) {
      const scope = await getLogisticsScopeContext(authPayload, authPayload.branchId);
      if (scope.isSupplierScoped) {
        return NextResponse.json(
          {
            success: false,
            code: 'FORBIDDEN_SUPPLIER_SCOPE',
            error: 'Tedarikçi portal oturumu ile şirket içi omnichannel işlemi yapılamaz.',
          },
          { status: 403 }
        );
      }
    }

    // 1. Stok Rezervasyonu
    if (action === 'reserve_order_stock') {
      const result = await reserveOrderStock(body.orderId, body.warehouseId);
      return NextResponse.json(result);
    }

    // 2. Parçalı Sevkiyat (Split Shipment)
    if (action === 'split_shipment') {
      const result = await executeSplitShipment({
        orderId: body.orderId,
        lineId: body.lineId,
        shipQuantity: Number(body.shipQuantity || 1),
        warehouseId: body.warehouseId,
        carrierName: body.carrierName || 'Yurtiçi Kargo VIP',
        trackingNumber: body.trackingNumber || `TRK-${Date.now().toString().slice(-8)}`
      });
      return NextResponse.json(result);
    }

    // 3. Muadil Ürün Önerisi
    if (action === 'suggest_substitute') {
      const result = await suggestSubstituteProduct(body.itemId);
      return NextResponse.json(result);
    }

    // 4. Muadil Ürünü Siparişe Uygula
    if (action === 'apply_substitute') {
      const result = await applySubstituteInOrder(
        body.orderId,
        body.lineId,
        body.substituteItemId
      );
      return NextResponse.json(result);
    }

    // 5. Siparişi Backorder'a Al
    if (action === 'backorder_order') {
      const result = await backorderRemainingLines(body.orderId, Number(body.backorderQty || 1));
      return NextResponse.json(result);
    }

    // 6. RMA İade Muayenesi (Restock or Quarantine)
    if (action === 'process_rma') {
      const result = await processRmaDisposition({
        rmaId: body.rmaId,
        disposition: body.disposition, // RESTOCK_TO_BIN | QUARANTINE_REPAIR
        targetBinCode: body.targetBinCode,
        warehouseId: body.warehouseId
      });
      return NextResponse.json(result);
    }

    // 7. Tüm Satış Kanallarını Senkronize Et
    if (action === 'sync_all_channels') {
      const result = await syncAllSalesChannels();
      return NextResponse.json(result);
    }

    // 8. GİB E-İrsaliye / E-Fatura Düzenle
    if (action === 'issue_edocument') {
      const result = await createGibEDocument(body.payload || body);
      return NextResponse.json(result);
    }

    // 9. Verileri Sıfırla / Seed Et
    if (action === 'seed_reset') {
      if (!isDemoEnvironment()) {
        return NextResponse.json(
          {
            success: false,
            code: 'DEMO_MODE_DISABLED',
            error: 'Örnek veri yükleme yalnızca demo ortamında kullanılabilir.',
          },
          { status: 403 }
        );
      }
      const result = await seedRealisticOmnichannelData();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: `Bilinmeyen işlem türü: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Omnichannel işlemi başarısız' },
      { status: 500 }
    );
  }
}
