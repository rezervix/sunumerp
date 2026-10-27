/**
 * GET /api/ai-agent/health
 * AI agent servislerinin durumunu ERP panelinden görüntülemek için.
 * Sadece admin/yönetici rolü erişebilir.
 */
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-permission';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await requirePermission('admin', 'read');
  if (auth instanceof NextResponse) return auth;

  try {
    // Son 24 saatteki AI agent istatistikleri
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLogs, autoSentCount, escalatedCount, avgLatency] = await Promise.all([
      prisma.aiAgentLog.count({ where: { createdAt: { gte: since } } }),
      prisma.aiAgentLog.count({ where: { createdAt: { gte: since }, wasAutoSent: true } }),
      prisma.aiAgentLog.count({ where: { createdAt: { gte: since }, escalatedToHuman: true } }),
      prisma.aiAgentLog.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { latencyMs: true },
      }),
    ]);

    const shadowModeCount = await prisma.aiAgentLog.count({
      where: { createdAt: { gte: since }, shadowMode: true },
    });

    return NextResponse.json({
      status: 'operational',
      last24h: {
        totalMessages: totalLogs,
        autoSent: autoSentCount,
        escalated: escalatedCount,
        shadowMode: shadowModeCount,
        escalationRate: totalLogs > 0 ? ((escalatedCount / totalLogs) * 100).toFixed(1) + '%' : '0%',
        avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
