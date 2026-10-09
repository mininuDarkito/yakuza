import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSeriesInfo } from '@/lib/mechacomic/engine';
import { MechaConfigService } from '@/lib/mechacomic/config-service';
import { createMechaComicLog } from '@/lib/mechacomic/logger';

export async function GET() {
  try {
    const series = await (prisma as any).mecha_series.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        url: true,
        title: true,
        cover_url: true,
        schedule_days: true,
        grupo_ids: true,
        last_auto_sync: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: { chapters: true, subscriptions: true }
        }
      }
    });

    // Auto-repara capas ausentes em segundo plano para não travar a API
    const itemsNeedingRepair = series.filter((item: any) => !item.cover_url || item.cover_url.includes('img_not_available') || item.cover_url.includes('re-ogp_logo'));
    if (itemsNeedingRepair.length > 0) {
      (async () => {
        for (const item of itemsNeedingRepair) {
          try {
            console.log(`[Auto-repair BG] Atualizando capa da série: ${item.title}`);
            const info = await getSeriesInfo(item.url);
            if (info && info.cover_url) {
              await (prisma as any).mecha_series.update({
                where: { id: item.id },
                data: { cover_url: info.cover_url }
              });
              console.log(`[Auto-repair BG] Capa atualizada com sucesso: ${info.cover_url}`);
            }
          } catch (e) {
            console.error(`[Auto-repair BG] Erro ao atualizar capa da série ${item.id}:`, e);
          }
        }
      })().catch(() => {});
    }

    const session = await MechaConfigService.getConfig('playwright_session');
    const hasAuth = !!session;

    return NextResponse.json({ series, hasAuth });
  } catch (error: any) {
    console.error('Erro ao listar séries MechaComic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let session = null;
  let requestUrl = '';

  try {
    session = await getServerSession(authOptions);
    const body = await req.json();
    requestUrl = body.url;
    if (!requestUrl || !requestUrl.includes('mechacomic.jp')) {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await (prisma as any).mecha_series.findUnique({ where: { url: requestUrl } });
    if (existing) {
      if (session?.user?.id) {
        await createMechaComicLog(session.user.id, 'series-add-duplicate', {
          url: requestUrl,
        });
      }
      return NextResponse.json({ error: 'Série já está sendo monitorada.' }, { status: 400 });
    }

    // Scrape series info
    console.log("Scraping series info from: ", requestUrl);
    const info = await getSeriesInfo(requestUrl);
    if (!info || !info.title) {
      return NextResponse.json({ error: 'Falha ao buscar informações da série.' }, { status: 400 });
    }

    // Create series
    const series = await (prisma as any).mecha_series.create({
      data: {
        url: requestUrl,
        title: info.title,
        cover_url: info.cover_url
      }
    });

    if (session?.user?.id) {
      await createMechaComicLog(session.user.id, 'series-add', {
        seriesId: series.id,
        title: info.title,
        url: requestUrl,
      });
    }

    // Create chapters
    for (const chapter of info.chapters) {
      await (prisma as any).mecha_chapters.create({
        data: {
          series_id: series.id,
          mecha_id: chapter.id,
          chapter_url: `https://mechacomic.jp/chapters/${chapter.id}`,
          chapter_number: chapter.number,
          chapter_title: chapter.title,
          status: chapter.status,
          cost: chapter.cost
        }
      });
    }

    return NextResponse.json({ series, chaptersAdded: info.chapters.length });
  } catch (error: any) {
    console.error('Erro ao adicionar série MechaComic:', error);
    if (session?.user?.id) {
      await createMechaComicLog(session.user.id, 'series-add-error', {
        url: requestUrl,
        error: error.message,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, title } = await req.json();
    if (!id || !title) {
      return NextResponse.json({ error: 'ID e título são obrigatórios.' }, { status: 400 });
    }

    const updated = await (prisma as any).mecha_series.update({
      where: { id },
      data: { title }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar série:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
