import { handleProcurementGet, handleProcurementPost } from '@/lib/logistics/procurement/apiHandlers';

export async function GET(request: Request) {
  return handleProcurementGet(request);
}

export async function POST(request: Request) {
  return handleProcurementPost(request);
}
