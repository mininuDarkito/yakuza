import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSeriesInfo } from '@/lib/mechacomic/engine';

export async function GET() {
  try {
    const series = await (prisma as any).mecha_series.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { chapters: true, subscriptions: true }
        }
      }
    });
    return NextResponse.json(series);
  } catch (error: any) {
    console.error('Erro ao listar séries MechaComic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || !url.includes('mechacomic.jp')) {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await (prisma as any).mecha_series.findUnique({ where: { url } });
    if (existing) {
      return NextResponse.json({ error: 'Série já está sendo monitorada.' }, { status: 400 });
    }

    // Scrape series info
    console.log("Scraping series info from: ", url);
    const info = await getSeriesInfo(url);
    if (!info || !info.title) {
      return NextResponse.json({ error: 'Falha ao buscar informações da série.' }, { status: 400 });
    }

    // Create series
    const series = await (prisma as any).mecha_series.create({
      data: {
        url,
        title: info.title,
        cover_url: info.cover_url
      }
    });

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
