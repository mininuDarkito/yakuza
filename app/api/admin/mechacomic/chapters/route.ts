import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get('seriesId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    if (!seriesId) {
      return NextResponse.json({ error: 'seriesId é obrigatório' }, { status: 400 });
    }

    const [chapters, total] = await Promise.all([
      prisma.mecha_chapters.findMany({
        where: { series_id: seriesId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          downloads: true,
          series: true
        }
      }),
      prisma.mecha_chapters.count({
        where: { series_id: seriesId }
      })
    ]);

    return NextResponse.json({
      chapters,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Erro ao listar capítulos MechaComic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
