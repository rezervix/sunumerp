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

export async function GET() {
  try {
    const data = await getOmnichannelOverviewSnapshot();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Omnichannel verileri alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

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
