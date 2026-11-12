import { NextResponse } from 'next/server';
import {
  getProcurementOverviewSnapshot,
  createPurchaseRequisition,
  approvePurchaseRequisition,
  settleConsignmentStock,
  seedRealisticProcurementData
} from '@/lib/services/procurementServerDb';
import { calculateDynamicReorderPoint } from '@/lib/services/procurementReorderEngine';
import { mockDatabase } from '@/lib/data/mockDatabase';

export async function GET() {
  try {
    const data = await getProcurementOverviewSnapshot();
    if (!data.criticalItems || data.criticalItems.length === 0) {
      return NextResponse.json(mockDatabase.getProcurementOverview());
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.warn("GET /api/procurement fallback to mockDatabase:", error);
    return NextResponse.json(mockDatabase.getProcurementOverview());
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Dinamik ROP Formülü Hesaplama
    if (action === 'calculate_rop') {
      const result = calculateDynamicReorderPoint(body.payload || body);
      return NextResponse.json({ success: true, data: result });
    }

    // 2. Yeni Satın Alma Talebi / Siparişi Oluştur
    if (action === 'create_requisition') {
      const result = await createPurchaseRequisition({
        warehouseId: body.warehouseId,
        supplierId: body.supplierId,
        itemId: body.itemId,
        quantity: Number(body.quantity || 1),
        unitCost: body.unitCost ? Number(body.unitCost) : undefined,
        priority: body.priority,
        notes: body.notes,
        triggerSource: body.triggerSource || 'MANUAL_REQUEST'
      });
      return NextResponse.json(result);
    }

    // 3. Satın Alma Talebini Onayla (PO Gönder)
    if (action === 'approve_requisition') {
      const result = await approvePurchaseRequisition(body.reqId, body.approvedBy);
      return NextResponse.json(result);
    }

    // 4. Konsinye (Emanet) Stok Satış / Hakediş Mutabakatı
    if (action === 'settle_consignment') {
      const result = await settleConsignmentStock(
        body.consignId,
        Number(body.consumeQty || 0),
        body.notes
      );
      return NextResponse.json(result);
    }

    // 5. Örnek Verileri Sıfırla / Seed Et
    if (action === 'seed_reset') {
      const result = await seedRealisticProcurementData();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: `Bilinmeyen işlem türü: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Satın alma işlemi başarısız' },
      { status: 500 }
    );
  }
}
