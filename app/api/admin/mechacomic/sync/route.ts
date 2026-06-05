import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSeriesInfo } from '@/lib/mechacomic/engine';
import { GoogleDriveUploader } from '@/lib/mechacomic/drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createMechaComicLog } from '@/lib/mechacomic/logger';

export async function POST(req: Request) {
  let session: any = null;
  let seriesId = '';

  try {
    session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    seriesId = body.seriesId;
    if (!seriesId) {
      return NextResponse.json({ error: 'seriesId é obrigatório' }, { status: 400 });
    }

    const series = await (prisma as any).mecha_series.findUnique({
      where: { id: seriesId },
      include: { chapters: true }
    });

    if (!series) {
      await createMechaComicLog(session.user.id, 'sync-error', {
        seriesId,
        reason: 'Série não encontrada',
      });
      return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 });
    }

    await createMechaComicLog(session.user.id, 'sync-start', {
      seriesId,
      seriesUrl: series.url,
    });

    // 1. Scraping MechaComic
    console.log(`[Sync] Iniciando scraping de ${series.url}`);
    const scrapedInfo = await getSeriesInfo(series.url);
    
    let newChaptersCount = 0;
    
    // Atualizar capítulos no banco
    for (const ch of scrapedInfo.chapters) {
      const chapterUrl = `https://mechacomic.jp/chapters/${ch.id}`;
      
      const exists = await (prisma as any).mecha_chapters.findFirst({
        where: { series_id: seriesId, chapter_url: chapterUrl }
      });
      if (!exists) {
        newChaptersCount++;
      }

      await (prisma as any).mecha_chapters.upsert({
        where: { series_id_chapter_url: { series_id: seriesId, chapter_url: chapterUrl } },
        update: {
          status: ch.status,
          cost: ch.cost,
          chapter_title: ch.title,
          chapter_number: ch.number,
        },
        create: {
          series_id: seriesId,
          mecha_id: ch.id,
          chapter_url: chapterUrl,
          chapter_title: ch.title,
          chapter_number: ch.number,
          status: ch.status,
          cost: ch.cost,
        }
      });
    }

    // 2. Drive Scanner
    console.log(`[Sync] Iniciando scanner do Google Drive para série: ${series.title}`);
    const drive = await GoogleDriveUploader.create();
    const siteFolderName = 'mechacomic';
    const seriesSafeName = series.title.replace(/[<>:"/\\|?*\x00]/g, '').trim() || "Sem_Titulo";

    console.log(`[Sync] Buscando pasta do site: ${siteFolderName}`);
    const siteFolderId = await drive.findFolderByName(siteFolderName);
    
    if (siteFolderId) {
      console.log(`[Sync] Pasta do site encontrada: ${siteFolderId}. Buscando série: ${seriesSafeName}`);
      const seriesFolderId = await drive.findFolderByName(seriesSafeName, siteFolderId);
      
      if (seriesFolderId) {
        console.log(`[Sync] Pasta da série encontrada: ${seriesFolderId}. Listando capítulos...`);
        const driveFolders = await drive.listFolders(seriesFolderId);
        console.log(`[Sync] Encontradas ${driveFolders.length} pastas no Drive.`);
        
        // Buscar capítulos atualizados para ter os nomes e IDs
        const dbChapters = await (prisma as any).mecha_chapters.findMany({
          where: { series_id: seriesId }
        });

        let matchesCount = 0;
        for (const chapter of dbChapters) {
          // Gerar nome seguro igual ao usado no upload
          let fullChapterName = (chapter.chapter_number || 'Cap').trim();
          if (chapter.chapter_title) {
            fullChapterName = `${fullChapterName} - ${chapter.chapter_title.trim()}`;
          }
          const chapterSafe = fullChapterName.replace(/:/g, '-').replace(/\s+/g, ' ').replace(/[<>"/\\|?*\x00]/g, '').trim();
          const chapterFolderName = chapterSafe;

          const driveMatch = driveFolders.find(f => {
            const name = f.name || '';
            return (
              name === chapterSafe ||
              name === chapterFolderName ||
              name === `${chapterSafe}-${chapter.id}` ||
              name === `${chapterSafe} (${chapter.id})` ||
              name.startsWith(`${chapterFolderName}`) ||
              name.startsWith(`${chapterSafe}-${chapter.id}`) ||
              name.startsWith(`${chapterSafe} (${chapter.id})`)
            );
          });
          if (driveMatch) {
            // Verificar se já existe um download
            const existingDownload = await (prisma as any).mecha_downloads.findFirst({
              where: { chapter_id: chapter.id },
              orderBy: { created_at: 'desc' }
            });

            if (!existingDownload) {
              await (prisma as any).mecha_downloads.create({
                data: {
                  chapter_id: chapter.id,
                  user_id: session.user.id,
                  status: 'completed',
                  drive_link: driveMatch.webViewLink,
                  stitch_mode: true
                }
              });
              matchesCount++;
            } else if (existingDownload.status !== 'completed' || !existingDownload.drive_link) {
              // Se falhou ou não tem link, mas a pasta existe no Drive, atualizamos
              await (prisma as any).mecha_downloads.update({
                where: { id: existingDownload.id },
                data: { 
                  status: 'completed', 
                  drive_link: driveMatch.webViewLink 
                }
              });
              matchesCount++;
            }
          }
        }
        console.log(`[Sync] Sincronização de Drive finalizada. ${matchesCount} capítulos vinculados.`);
      } else {
        console.warn(`[Sync] Pasta da série "${seriesSafeName}" não encontrada no Drive.`);
      }
    } else {
      console.warn(`[Sync] Pasta raiz "${siteFolderName}" não encontrada no Drive.`);
    }

    // Atualiza o updated_at da série
    await (prisma as any).mecha_series.update({
      where: { id: seriesId },
      data: { updated_at: new Date() }
    });

    const totalChaptersCount = await (prisma as any).mecha_chapters.count({
      where: { series_id: seriesId }
    });

    await createMechaComicLog(session.user.id, 'sync-success', {
      seriesId,
      newChapters: newChaptersCount,
      totalChapters: totalChaptersCount,
      points: scrapedInfo.points,
    });

    return NextResponse.json({ 
      success: true, 
      points: scrapedInfo.points,
      newChapters: newChaptersCount,
      totalChapters: totalChaptersCount
    });
  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    await createMechaComicLog(session.user.id, 'sync-error', {
      seriesId,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
