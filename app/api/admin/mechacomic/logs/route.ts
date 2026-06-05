import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const level = searchParams.get('level') || 'error';
    const take = Number(searchParams.get('take') || 50);

    const logs = await prisma.activity_logs.findMany({
      where: {
        entity_type: 'mechacomic',
      },
      include: {
        users: {
          select: {
            discord_username: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 100,
    });

    const filtered = logs.filter((log) => {
      const detailText = JSON.stringify(log.details || {}).toLowerCase();
      const actionText = String(log.action || '').toLowerCase();
      const userText = String(log.users?.discord_username || '').toLowerCase();

      if (level === 'error') {
        const isError = actionText.includes('error') || detailText.includes('error');
        if (!isError) return false;
      }

      if (!search) return true;
      const needle = search.toLowerCase();
      return (
        actionText.includes(needle) ||
        detailText.includes(needle) ||
        userText.includes(needle)
      );
    }).slice(0, take);

    return NextResponse.json({ logs: filtered });
  } catch (error: any) {
    console.error('Erro ao buscar logs MechaComic:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar logs' }, { status: 500 });
  }
}
