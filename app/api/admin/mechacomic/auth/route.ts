import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loginAndSaveSession } from '@/lib/mechacomic/engine';
import { createMechaComicLog } from '@/lib/mechacomic/logger';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Chama o engine para fazer login e salvar a sessão no auth.json
    const result = await loginAndSaveSession(email, password);

    if (result.error) {
      await createMechaComicLog(session.user.id, 'auth-error', {
        message: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await createMechaComicLog(session.user.id, 'auth-success', {
      message: 'Sessão renovada com sucesso',
    });

    return NextResponse.json({ success: true, message: 'Sessão renovada com sucesso!' });
  } catch (error: any) {
    console.error('Erro na rota de login MechaComic:', error);
    if (session?.user?.id) {
      await createMechaComicLog(session.user.id, 'auth-exception', {
        error: error.message,
      });
    }
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
