/**
 * GET /api/ai-agent/logs
 * AiAgentLog tablosunu sayfalandırmalı olarak getirir.
 * Denetim ve kalite analizi için admin panelinde kullanılır.
 */
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-permission';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await requirePermission('admin', 'read');
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);
  const skip = (page - 1) * pageSize;
  const onlyEscalated = searchParams.get('escalated') === 'true';
  const onlySent = searchParams.get('sent') === 'true';

  try {
    const where: any = {};
    if (onlyEscalated) where.escalatedToHuman = true;
    if (onlySent) where.wasAutoSent = true;

    const [logs, total] = await Promise.all([
      prisma.aiAgentLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true, company: true } },
        },
      }),
      prisma.aiAgentLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
