import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get('seriesId');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam) : null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : (page ? 20 : 1000);
    const skip = page ? (page - 1) * limit : 0;
    
    if (!seriesId) {
      return NextResponse.json({ error: 'seriesId é obrigatório' }, { status: 400 });
    }

    const [chapters, total] = await Promise.all([
      (prisma as any).mecha_chapters.findMany({
        where: { series_id: seriesId },
        orderBy: { created_at: 'desc' },
        ...(page ? { skip, take: limit } : { take: limit }),
        include: {
          downloads: true,
          series: true
        }
      }),
      (prisma as any).mecha_chapters.count({
        where: { series_id: seriesId }
      })
    ]);

    return NextResponse.json({
      chapters,
      total,
      page: page || 1,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Erro ao listar capítulos MechaComic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
