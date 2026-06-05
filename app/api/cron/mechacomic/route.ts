import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSeriesInfo } from '@/lib/mechacomic/engine';
import { GoogleDriveUploader } from '@/lib/mechacomic/drive';

// POST /api/cron/mechacomic
// Chamado internamente pelo node-cron todo dia às 15:00 UTC (12:00 BRT / 00:00 JST)
// Protegido pelo header x-cron-secret
export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Dia da semana em horário de Brasília (UTC-3)
    // No momento do cron (15:00 UTC), em Brasília são 12:00 do mesmo dia
    const nowUTC = new Date();
    const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const todayDayOfWeek = nowBRT.getDay(); // 0=Dom, 1=Seg, ... 6=Sáb

    console.log(`[CronSync] Iniciando sync automático. Dia da semana (BRT): ${todayDayOfWeek}`);

    // Busca séries agendadas para hoje
    const seriesToSync = await (prisma as any).mecha_series.findMany({
      where: {
        schedule_days: {
          has: todayDayOfWeek
        }
      }
    });

    if (seriesToSync.length === 0) {
      console.log('[CronSync] Nenhuma série agendada para hoje.');
      return NextResponse.json({ message: 'Nenhuma série agendada para hoje.', synced: 0, newChapters: [] });
    }

    console.log(`[CronSync] ${seriesToSync.length} série(s) para sincronizar.`);

    const allNewChapters: any[] = [];
    const results: any[] = [];

    for (const series of seriesToSync) {
      try {
        console.log(`[CronSync] Sincronizando: ${series.title}`);

        // --- Scraping MechaComic ---
        const scrapedInfo = await getSeriesInfo(series.url);
        let newChaptersCount = 0;
        const newChaptersForSeries: any[] = [];

        for (const ch of scrapedInfo.chapters) {
          const chapterUrl = `https://mechacomic.jp/chapters/${ch.id}`;

          const exists = await (prisma as any).mecha_chapters.findFirst({
            where: { series_id: series.id, chapter_url: chapterUrl }
          });

          if (!exists) {
            newChaptersCount++;
            const created = await (prisma as any).mecha_chapters.create({
              data: {
                series_id: series.id,
                mecha_id: ch.id,
                chapter_url: chapterUrl,
                chapter_title: ch.title,
                chapter_number: ch.number,
                status: ch.status,
                cost: ch.cost,
              }
            });
            newChaptersForSeries.push({ ...created, series });
          } else {
            // Atualiza status/custo
            await (prisma as any).mecha_chapters.update({
              where: { id: exists.id },
              data: { status: ch.status, cost: ch.cost, chapter_title: ch.title, chapter_number: ch.number }
            });
          }
        }

        // --- Drive Scanner ---
        try {
          const drive = await GoogleDriveUploader.create();
          const siteFolderName = 'mechacomic';
          const seriesSafeName = series.title.replace(/[<>:"/\\|?*\x00]/g, '').trim() || 'Sem_Titulo';

          const siteFolderId = await drive.findFolderByName(siteFolderName);
          if (siteFolderId) {
            const seriesFolderId = await drive.findFolderByName(seriesSafeName, siteFolderId);
            if (seriesFolderId) {
              const driveFolders = await drive.listFolders(seriesFolderId);
              const dbChapters = await (prisma as any).mecha_chapters.findMany({
                where: { series_id: series.id }
              });

              for (const chapter of dbChapters) {
                let fullChapterName = (chapter.chapter_number || 'Cap').trim();
                if (chapter.chapter_title) {
                  fullChapterName = `${fullChapterName} - ${chapter.chapter_title.trim()}`;
                }
                const chapterSafe = fullChapterName.replace(/:/g, '-').replace(/\s+/g, ' ').replace(/[<>"/\\|?*\x00]/g, '').trim();

                const driveMatch = driveFolders.find((f: any) => f.name === chapterSafe);
                if (driveMatch) {
                  const existingDownload = await (prisma as any).mecha_downloads.findFirst({
                    where: { chapter_id: chapter.id },
                    orderBy: { created_at: 'desc' }
                  });

                  if (!existingDownload) {
                    // Usa um user_id de admin fixo — busca o primeiro admin disponível
                    const adminUser = await (prisma as any).users.findFirst({
                      where: { role: 'admin' }
                    });
                    if (adminUser) {
                      await (prisma as any).mecha_downloads.create({
                        data: {
                          chapter_id: chapter.id,
                          user_id: adminUser.id,
                          status: 'completed',
                          drive_link: driveMatch.webViewLink,
                          stitch_mode: true
                        }
                      });
                    }
                  } else if (existingDownload.status !== 'completed' || !existingDownload.drive_link) {
                    await (prisma as any).mecha_downloads.update({
                      where: { id: existingDownload.id },
                      data: { status: 'completed', drive_link: driveMatch.webViewLink }
                    });
                  }
                }
              }
            }
          }
        } catch (driveErr) {
          console.error(`[CronSync] Erro no Drive para ${series.title}:`, driveErr);
          // Não interrompe o fluxo
        }

        // Atualiza last_auto_sync
        await (prisma as any).mecha_series.update({
          where: { id: series.id },
          data: { last_auto_sync: new Date(), updated_at: new Date() }
        });

        allNewChapters.push(...newChaptersForSeries);
        results.push({ seriesId: series.id, title: series.title, newChapters: newChaptersCount });
        console.log(`[CronSync] ${series.title}: ${newChaptersCount} capítulo(s) novo(s).`);
      } catch (seriesErr: any) {
        console.error(`[CronSync] Erro ao sincronizar "${series.title}":`, seriesErr);
        results.push({ seriesId: series.id, title: series.title, error: seriesErr.message });
      }
    }

    console.log('[CronSync] Sincronização automática concluída.', results);
    return NextResponse.json({
      message: 'Sincronização automática concluída.',
      synced: seriesToSync.length,
      results,
      newChapters: allNewChapters
    });
  } catch (error: any) {
    console.error('[CronSync] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET para debug manual — retorna quais séries seriam sincronizadas hoje
export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const nowUTC = new Date();
    const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const todayDayOfWeek = nowBRT.getDay();

    const seriesToSync = await (prisma as any).mecha_series.findMany({
      where: { schedule_days: { has: todayDayOfWeek } },
      select: { id: true, title: true, schedule_days: true, last_auto_sync: true }
    });

    return NextResponse.json({
      today: todayDayOfWeek,
      todayBRT: nowBRT.toISOString(),
      scheduledCount: seriesToSync.length,
      series: seriesToSync
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
