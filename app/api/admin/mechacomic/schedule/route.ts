import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/mechacomic/schedule?seriesId=xxx
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get('seriesId');
    if (!seriesId) {
      return NextResponse.json({ error: 'seriesId é obrigatório' }, { status: 400 });
    }

    const series = await (prisma as any).mecha_series.findUnique({
      where: { id: seriesId },
      select: { schedule_days: true, last_auto_sync: true }
    });

    if (!series) {
      return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 });
    }

    return NextResponse.json(series);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/mechacomic/schedule
// Body: { seriesId: string, days: number[] }
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { seriesId, days } = await req.json();
    if (!seriesId || !Array.isArray(days)) {
      return NextResponse.json({ error: 'seriesId e days são obrigatórios' }, { status: 400 });
    }

    // Validar que os dias são valores entre 0-6
    const validDays = days.filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6);

    const updated = await (prisma as any).mecha_series.update({
      where: { id: seriesId },
      data: { schedule_days: validDays },
      select: { id: true, schedule_days: true }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
