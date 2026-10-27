import { query } from '../db/readonlyClient';
import type { ToolDefinition, ToolCall } from '../llm/adapter';

/**
 * ERP Tool Tanımları — SADECE OKUMA
 * Hiçbir tool veritabanına yazma yapmaz.
 * Tüm sorgular ai_readonly rolü üzerinden gider.
 */

export const ERP_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'getCustomerOrders',
    description: 'Müşterinin son siparişlerini getirir. Sipariş durumu, toplam tutar ve ödeme durumu dahil.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Müşteri ID' },
        limit: { type: 'number', description: 'Kaç sipariş getirileceği (varsayılan: 5)' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'getOrderStatus',
    description: 'Sipariş numarasına göre siparişin güncel durumunu getirir.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'Sipariş numarası' },
      },
      required: ['orderNumber'],
    },
  },
  {
    name: 'getProductStock',
    description: 'Ürün adına göre stok bilgisini ve fiyatı getirir.',
    parameters: {
      type: 'object',
      properties: {
        productName: { type: 'string', description: 'Ürün adı (kısmi eşleşme desteklenir)' },
        branchId: { type: 'string', description: 'Şube ID (opsiyonel — şubeye özel fiyat için)' },
      },
      required: ['productName'],
    },
  },
  {
    name: 'getCustomerBalance',
    description: 'Müşterinin ödeme özetini getirir: toplam sipariş tutarı ve ödenmemiş tutarlar.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'Müşteri ID' },
      },
      required: ['customerId'],
    },
  },
];

// ─── Tool Uygulama Fonksiyonları ──────────────────────────────────────────────

async function getCustomerOrders(customerId: string, limit = 5): Promise<unknown> {
  const rows = await query(
    `SELECT id, "orderNumber", title, status, "paymentStatus", "totalAmount", "orderDate"
     FROM "Order"
     WHERE "customerId" = $1
       AND "customerId" IS NOT NULL
     ORDER BY "orderDate" DESC
     LIMIT $2`,
    [customerId, limit],
  );
  return rows;
}

async function getOrderStatus(orderNumber: string): Promise<unknown> {
  const rows = await query(
    `SELECT id, "orderNumber", title, status, "paymentStatus", "totalAmount", "orderDate",
            "customerName"
     FROM "Order"
     WHERE "orderNumber" = $1
     LIMIT 1`,
    [orderNumber],
  );
  return rows[0] ?? { error: 'Sipariş bulunamadı' };
}

async function getProductStock(productName: string, branchId?: string): Promise<unknown> {
  const rows = await query(
    `SELECT p.id, p.name, p.unit, p."isActive",
            bp.price, bp."branchId",
            COALESCE(sr.pending_qty, 0) as "pendingRequestQty"
     FROM "Product" p
     LEFT JOIN "BranchPrice" bp ON bp."productId" = p.id
       AND ($2::text IS NULL OR bp."branchId" = $2)
     LEFT JOIN (
       SELECT "productId", SUM(quantity) as pending_qty
       FROM "StockRequest"
       WHERE status = 'pending'
       GROUP BY "productId"
     ) sr ON sr."productId" = p.id
     WHERE p.name ILIKE $1
       AND p."isActive" = true
     ORDER BY p.name
     LIMIT 10`,
    [`%${productName}%`, branchId ?? null],
  );
  return rows;
}

async function getCustomerBalance(customerId: string): Promise<unknown> {
  const rows = await query(
    `SELECT
       COUNT(*)                                         as "totalOrders",
       COALESCE(SUM("totalAmount"), 0)                 as "totalAmount",
       COALESCE(SUM(CASE WHEN "paymentStatus" = 'paid'    THEN "totalAmount" ELSE 0 END), 0) as "paidAmount",
       COALESCE(SUM(CASE WHEN "paymentStatus" = 'unpaid'  THEN "totalAmount" ELSE 0 END), 0) as "unpaidAmount",
       COALESCE(SUM(CASE WHEN "paymentStatus" = 'partial' THEN "totalAmount" ELSE 0 END), 0) as "partialAmount"
     FROM "Order"
     WHERE "customerId" = $1`,
    [customerId],
  );
  return rows[0] ?? {};
}

// ─── Tool Dispatcher ─────────────────────────────────────────────────────────

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  error?: string;
}

/**
 * LLM'den gelen tool call'ları çalıştırır.
 * Tüm sonuçları döndürür (ikinci LLM çağrısı için).
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: { customerId?: string; branchId?: string },
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const tc of toolCalls) {
    try {
      let result: unknown;

      switch (tc.name) {
        case 'getCustomerOrders':
          result = await getCustomerOrders(
            (tc.arguments.customerId as string) || context.customerId || '',
            (tc.arguments.limit as number) || 5,
          );
          break;

        case 'getOrderStatus':
          result = await getOrderStatus(tc.arguments.orderNumber as string);
          break;

        case 'getProductStock':
          result = await getProductStock(
            tc.arguments.productName as string,
            (tc.arguments.branchId as string) || context.branchId,
          );
          break;

        case 'getCustomerBalance':
          result = await getCustomerBalance(
            (tc.arguments.customerId as string) || context.customerId || '',
          );
          break;

        default:
          result = { error: `Bilinmeyen tool: ${tc.name}` };
      }

      results.push({ toolCallId: tc.id, toolName: tc.name, result });
    } catch (err: any) {
      results.push({
        toolCallId: tc.id,
        toolName: tc.name,
        result: null,
        error: err.message,
      });
    }
  }

  return results;
}
