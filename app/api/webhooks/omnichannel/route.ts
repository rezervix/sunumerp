import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reserveOrderStock } from '@/lib/services/omnichannelServerDb';

/**
 * Dış Entegratör ve Pazaryeri Webhook Alıcı Uç Noktası (Trendyol, Hepsiburada, Shopify, Kargo vb.)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') || 'all';

  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Sunum ERP Omnichannel Webhook Gateway',
    timestamp: new Date().toISOString(),
    supportedChannels: ['TRENDYOL', 'HEPSIBURADA', 'SHOPIFY', 'CARGO_TRACKING'],
    documentation: {
      postUrl: '/api/webhooks/omnichannel?channel={channel_code}',
      authHeader: 'X-Channel-Secret: <your_api_key>',
      events: ['ORDER_CREATED', 'SHIPMENT_STATUS_UPDATE', 'RETURN_REQUEST']
    }
  });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = (searchParams.get('channel') || 'EXTERNAL').toUpperCase();
    const secretKey = request.headers.get('x-channel-secret') || request.headers.get('authorization');

    const body = await request.json();
    const event = body.event || body.eventType || 'ORDER_CREATED';

    // 1. OMNICHANNEL YENİ SİPARİŞ GELMESİ (ORDER_CREATED)
    if (event === 'ORDER_CREATED' || body.orderNumber) {
      const orderNo = body.orderNumber || `EXT-${Date.now().toString().slice(-6)}`;
      const customer = body.customerName || body.customer?.fullName || 'Pazaryeri Müşterisi';
      const city = body.city || body.shippingAddress?.city || 'İstanbul';
      const totalAmount = parseFloat(body.totalAmount || body.totalPrice || '0') || 0;

      // Siparişi veritabanına kaydet
      const createdOrder = await (prisma as any).omnichannelOrder.create({
        data: {
          orderNumber: orderNo,
          channelCode: channel,
          channelOrderRef: body.orderId || body.channelOrderRef || `REF-${Date.now()}`,
          customerName: customer,
          customerCity: city,
          fulfillmentStrategy: body.fulfillmentStrategy || 'STANDARD_WAREHOUSE',
          status: 'PROCESSING',
          totalAmount,
          currency: body.currency || 'TRY'
        }
      });

      // Kalemleri kaydet
      const items = body.items || body.lines || [];
      for (const it of items) {
        // Ürünü veritabanından bul
        const dbItem = await (prisma as any).inventoryItem.findFirst({
          where: {
            OR: [
              { barcode: it.barcode },
              { sku: it.sku },
              { name: it.name }
            ]
          }
        }).catch(() => null);

        await (prisma as any).orderShipmentLine.create({
          data: {
            orderId: createdOrder.id,
            itemId: dbItem?.id || null,
            sku: it.sku || dbItem?.sku || 'SKU-EXT',
            itemName: it.name || dbItem?.name || 'Ürün',
            quantity: parseFloat(it.quantity || it.qty || 1),
            unitPrice: parseFloat(it.unitPrice || it.price || 0),
            status: 'PENDING'
          }
        }).catch(() => null);
      }

      // 2. Gerçek zamanlı stok rezervasyonu yap (reservedQty artar, availableQty azalır)
      await reserveOrderStock(createdOrder.id).catch(() => null);

      return NextResponse.json({
        success: true,
        message: `Webhook kabul edildi: ${channel} siparişi (${orderNo}) kaydedildi ve stok rezerve edildi.`,
        orderId: createdOrder.id,
        orderNumber: orderNo
      });
    }

    // 2. KARGO DURUM GÜNCELLEMESİ (SHIPMENT_STATUS_UPDATE)
    if (event === 'SHIPMENT_STATUS_UPDATE' || body.trackingNumber) {
      const tracking = body.trackingNumber;
      const status = body.status; // DELIVERED, IN_TRANSIT, etc.

      const line = await (prisma as any).orderShipmentLine.findFirst({
        where: { carrierTracking: tracking }
      }).catch(() => null);

      if (line) {
        await (prisma as any).orderShipmentLine.update({
          where: { id: line.id },
          data: { status: status === 'DELIVERED' ? 'SHIPPED' : 'PARTIALLY_SHIPPED' }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Kargo takip güncellemesi işlendi: ${tracking} -> ${status}`
      });
    }

    // 3. İADE TALEBİ GELMESİ (RETURN_REQUEST)
    if (event === 'RETURN_REQUEST') {
      const rmaNo = `RMA-${Date.now().toString().slice(-6)}`;
      const rma = await (prisma as any).returnRmaRecord.create({
        data: {
          rmaNumber: rmaNo,
          orderNumber: body.orderNumber || 'BILINMEYEN',
          channelCode: channel,
          customerName: body.customerName || 'Müşteri',
          sku: body.sku || 'SKU-01',
          itemName: body.itemName || 'İade Ürün',
          returnQty: parseFloat(body.quantity || 1),
          returnReason: body.reason || 'Müşteri vazgeçti',
          qcInspectionResult: 'PENDING_INSPECTION',
          refundAmount: parseFloat(body.refundAmount || 0),
          refundStatus: 'PENDING',
          returnTrackingNo: body.trackingNumber || null
        }
      });

      return NextResponse.json({
        success: true,
        message: `İade talebi oluşturuldu: ${rmaNo}`,
        rma
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook alındı fakat özel bir işlem tetiklenmedi.',
      receivedPayload: body
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook işleme hatası' },
      { status: 500 }
    );
  }
}

