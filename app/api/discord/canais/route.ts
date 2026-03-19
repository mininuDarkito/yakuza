import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN; // Certifique-se de adicionar no .env

    // 1. Verificação de Sessão e Configuração
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "401 - Não autorizado. Token do usuário ausente." }, 
        { status: 401 }
      );
    }

    if (!guildId || !botToken) {
      console.error("❌ [API_DISCORD]: Configurações (GUILD_ID ou BOT_TOKEN) faltando no .env");
      return NextResponse.json(
        { error: "Erro de configuração no servidor." }, 
        { status: 500 }
      );
    }

    // 2. Validação de Segurança: O usuário pertence a este servidor?
    // Usamos o token do usuário (Bearer) para listar os servidores DELE
    const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!userGuildsRes.ok) {
      return NextResponse.json({ error: "Falha ao validar sua conta no Discord." }, { status: 401 });
    }

    const userGuilds = await userGuildsRes.json();
    const isMember = userGuilds.some((g: any) => g.id === guildId);

    if (!isMember) {
      return NextResponse.json(
        { error: "Acesso negado: Você não é membro do servidor configurado." }, 
        { status: 403 }
      );
    }

    // 3. Busca os Canais via BOT TOKEN (Garante o bypass do erro 401 de permissão de usuário)
    const channelsRes = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: { 
        Authorization: `Bot ${botToken}`, // Mudança crucial: Bot em vez de Bearer
        "Content-Type": "application/json"
      },
    });

    if (!channelsRes.ok) {
      const errorData = await channelsRes.json();
      console.error("❌ [API_DISCORD]: Erro ao buscar canais via Bot", errorData);
      return NextResponse.json(
        { error: "O Bot não conseguiu ler os canais do servidor." }, 
        { status: channelsRes.status }
      );
    }

    const allChannels = await channelsRes.json();

    // 4. Filtragem e Ordenação (Apenas canais de texto)
    const canaisValidos = allChannels
      .filter((c: any) => c.type === 0) 
      .map((c: any) => ({
        id: c.id,
        nome: c.name,
        posicao: c.position
      }))
      .sort((a: any, b: any) => a.posicao - b.posicao);

    return NextResponse.json(canaisValidos);

  } catch (error: any) {
    console.error("❌ [API_DISCORD_CRITICAL]:", error.message);
    return NextResponse.json(
      { error: "Erro interno ao processar canais", details: error.message }, 
      { status: 500 }
    );
  }
}