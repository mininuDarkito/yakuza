import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/mechacomic/daily-releases
// Retorna capítulos de séries que foram sincronizadas automaticamente hoje
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Calcula início do dia em BRT (UTC-3)
    const nowUTC = new Date();
    const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const startOfDayBRT = new Date(nowBRT);
    startOfDayBRT.setHours(0, 0, 0, 0);
    // Converte de volta para UTC para a query
    const startOfDayUTC = new Date(startOfDayBRT.getTime() + 3 * 60 * 60 * 1000);

    // Busca séries sincronizadas hoje
    const syncedSeriesToday = await (prisma as any).mecha_series.findMany({
      where: {
        last_auto_sync: {
          gte: startOfDayUTC
        }
      },
      select: { id: true, title: true, cover_url: true }
    });

    if (syncedSeriesToday.length === 0) {
      return NextResponse.json({ chapters: [] });
    }

    const seriesIds = syncedSeriesToday.map((s: any) => s.id);
    const seriesMap = Object.fromEntries(syncedSeriesToday.map((s: any) => [s.id, s]));

    // Busca capítulos criados hoje (novos) dessas séries
    const chapters = await (prisma as any).mecha_chapters.findMany({
      where: {
        series_id: { in: seriesIds },
        created_at: { gte: startOfDayUTC }
      },
      include: {
        downloads: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Adiciona info da série em cada capítulo
    const chaptersWithSeries = chapters.map((ch: any) => ({
      ...ch,
      series: seriesMap[ch.series_id]
    }));

    return NextResponse.json({ chapters: chaptersWithSeries });
  } catch (error: any) {
    console.error('[DailyReleases] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
