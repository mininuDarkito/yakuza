import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { seriesId, seriesTitle, coverUrl, chapterFullTitle, driveLink, groupIds } = await req.json();

    let targetGroupIds: string[] = Array.isArray(groupIds) ? groupIds : [];

    // Se nenhum grupo enviado na request, busca do banco pelo seriesId
    if (targetGroupIds.length === 0 && seriesId) {
      const series = await (prisma as any).mecha_series.findUnique({
        where: { id: seriesId },
        select: { grupo_ids: true, title: true, cover_url: true }
      });
      if (series && Array.isArray(series.grupo_ids)) {
        targetGroupIds = series.grupo_ids;
      }
    }

    if (targetGroupIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum grupo vinculado a esta série. Vincule ao menos um grupo primeiro.' }, { status: 400 });
    }

    const token = await getSetting('DISCORD_BOT_TOKEN');
    if (!token) {
      return NextResponse.json({ error: 'Bot Token do Discord não configurado (Admin › Configurações).' }, { status: 500 });
    }

    // Busca grupos no banco
    const groups = await prisma.grupos.findMany({
      where: { id: { in: targetGroupIds } },
      select: { id: true, nome: true, channel_id: true }
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Nenhum grupo encontrado com os IDs fornecidos.' }, { status: 404 });
    }

    const formattedCover = coverUrl?.startsWith('//') ? `https:${coverUrl}` : coverUrl;
    const discordText = `serie: [${seriesTitle}](${formattedCover || ''})\ncap: ${chapterFullTitle}\n\nlink drive: ${driveLink}`;

    const sentGroups: string[] = [];
    const errors: string[] = [];

    for (const group of groups) {
      if (!group.channel_id) {
        errors.push(`Grupo ${group.nome} não possui Canal do Discord (channel_id) configurado.`);
        continue;
      }

      try {
        await axios.post(
          `https://discord.com/api/v10/channels/${group.channel_id}/messages`,
          {
            content: discordText,
            embeds: [
              {
                title: `📚 ${seriesTitle}`,
                description: `**Capítulo:** ${chapterFullTitle}\n\n📎 **[Acessar no Google Drive](${driveLink})**`,
                color: 0x6366f1,
                thumbnail: formattedCover ? { url: formattedCover } : undefined,
                footer: { text: `Enviado para ${group.nome} • Yakuza Raws` },
                timestamp: new Date().toISOString()
              }
            ]
          },
          {
            headers: {
              Authorization: `Bot ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        sentGroups.push(group.nome);
      } catch (err: any) {
        console.error(`Erro ao enviar mensagem para canal ${group.channel_id} (Grupo ${group.nome}):`, err?.response?.data || err.message);
        errors.push(`Falha ao enviar para ${group.nome}: ${err?.response?.data?.message || err.message}`);
      }
    }

    if (sentGroups.length === 0) {
      return NextResponse.json({ error: `Não foi possível enviar para nenhum canal: ${errors.join(', ')}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Mensagem enviada com sucesso para ${sentGroups.length} grupo(s): ${sentGroups.join(', ')}.`,
      sentGroups,
      errors
    });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem para Discord dos grupos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
