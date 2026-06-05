import { NextResponse } from 'next/server';
import { getAccountInfo } from '@/lib/mechacomic/engine';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MechaConfigService } from '@/lib/mechacomic/config-service';

export async function GET(req: Request) {
  // Trigger migration (only runs if files exist)
  await MechaConfigService.migrateFilesToDb();
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountInfo = await getAccountInfo();
    const isValid = accountInfo !== null;
    return NextResponse.json({ 
      isValid,
      points: accountInfo?.points || '0',
      username: accountInfo?.username || null,
    });
  } catch (error: any) {
    console.error('Erro ao buscar pontos da conta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
