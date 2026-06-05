import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createMechaComicLog } from '@/lib/mechacomic/logger';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { seriesId, chapterNumber } = await req.json();

    if (!seriesId || !chapterNumber) {
      return NextResponse.json({ error: 'Série e número do capítulo são obrigatórios' }, { status: 400 });
    }

    const chapters = await prisma.mecha_chapters.findMany({
      where: { series_id: seriesId }
    });

    const targetNum = parseInt(String(chapterNumber).replace(/\D/g, ''), 10);

    const matchedChapter = chapters.find(ch => {
      if (!ch.chapter_number) return false;
      const chNum = parseInt(ch.chapter_number.replace(/\D/g, ''), 10);
      return chNum === targetNum;
    });

    if (!matchedChapter) {
      await createMechaComicLog(session.user.id, 'quick-download-not-found', {
        seriesId,
        chapterNumber,
      });

      return NextResponse.json({ 
        error: `Capítulo ${chapterNumber} não encontrado no banco. Clique no card e atualize a série.` 
      }, { status: 404 });
    }

    await createMechaComicLog(session.user.id, 'quick-download-found', {
      seriesId,
      chapterNumber,
      chapterId: matchedChapter.id,
    });

    return NextResponse.json({ success: true, chapterId: matchedChapter.id });

  } catch (error: any) {
    console.error('Erro na busca rápida de capítulo:', error);
    await createMechaComicLog(session.user.id, 'quick-download-exception', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
