import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { seriesId, grupoIds } = await req.json();
    if (!seriesId || !Array.isArray(grupoIds)) {
      return NextResponse.json({ error: 'seriesId e grupoIds (array) são obrigatórios.' }, { status: 400 });
    }

    const updated = await (prisma as any).mecha_series.update({
      where: { id: seriesId },
      data: { grupo_ids: grupoIds, updated_at: new Date() }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Erro ao atualizar grupos da série:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
