import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reserveOrderStock } from '@/lib/services/omnichannelServerDb';
import { LogisticsDomainError } from '@/lib/logistics/security';
import { isDemoEnvironment } from '@/lib/config/production-feature-flags';
import { checkRateLimit, resolveRequestClientIp } from '@/lib/security/rateLimiter';
import {
  ingestSecureReturnWebhook,
  verifyReturnWebhookSignature,
} from '@/lib/logistics/returns/financeAndWebhookService';

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
      authHeader: 'X-Webhook-Signature: sha256=<hmac> | X-Channel-Secret: <secret>',
      events: ['ORDER_CREATED', 'SHIPMENT_STATUS_UPDATE', 'RETURN_REQUEST']
    }
  });
}

export async function POST(request: Request) {
  try {
    const ip = resolveRequestClientIp(request.headers);
    const rl = checkRateLimit(`webhook-omni:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Çok fazla webhook isteği.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const channel = (searchParams.get('channel') || 'EXTERNAL').toUpperCase();
    const signatureHeader =
      request.headers.get('x-webhook-signature') ||
      request.headers.get('x-hub-signature-256');
    const secretHeader =
      request.headers.get('x-channel-secret') ||
      request.headers.get('authorization');

    const rawBody = await request.text();
    let body: Record<string, any> = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json(
        { success: false, code: 'INVALID_JSON', error: 'Geçersiz JSON webhook gövdesi.' },
        { status: 400 }
      );
    }

    const event = String(body.event || body.eventType || (body.orderNumber && !body.sku ? 'ORDER_CREATED' : 'ORDER_CREATED'));

    // 0. İMZA DOĞRULAMALI İADE TALEBİ WEBHOOK (RETURN_REQUEST)
    if (event === 'RETURN_REQUEST') {
      try {
        const result = await ingestSecureReturnWebhook({
          channelCode: channel,
          rawBody,
          payload: body,
          signatureHeader,
          secretHeader,
        });

        return NextResponse.json({
          success: true,
          duplicate: result.duplicate,
          message: result.duplicate
            ? `Tekilleştirilen mevcut iade döndü: ${result.rmaNumber}`
            : `İmzalı iade talebi kabul edildi ve RMA oluşturuldu: ${result.rmaNumber}`,
          rmaNumber: result.rmaNumber,
          rma: result.rma,
        });
      } catch (err) {
        if (err instanceof LogisticsDomainError) {
          return NextResponse.json(
            { success: false, code: err.code, error: err.message, details: err.details },
            { status: err.status }
          );
        }
        throw err;
      }
    }

    // Demo kapalıyken (gerçek kurulum) veya imza başlığı gönderilmişse HMAC/Channel Secret doğrula (fail-closed)
    const demoMode = isDemoEnvironment();
    const hasAuthHeaders = Boolean(signatureHeader || secretHeader);
    if (!demoMode || hasAuthHeaders) {
      const sigCheck = verifyReturnWebhookSignature({
        rawBody,
        signatureHeader,
        secretHeader,
        channelCode: channel,
      });
      if (!sigCheck.verified) {
        return NextResponse.json(
          {
            success: false,
            code: sigCheck.reason || 'UNAUTHORIZED_WEBHOOK',
            error: 'Webhook imza veya kanal gizli anahtarı doğrulaması başarısız.',
          },
          { status: 401 }
        );
      }
    }

    // 1. OMNICHANNEL YENİ SİPARİŞ GELMESİ (ORDER_CREATED)
    if (event === 'ORDER_CREATED' || (!body.event && !body.eventType && body.orderNumber)) {
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

