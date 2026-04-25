import axios from "axios";
import { prisma } from "./db";
import logsConfig from "../logs_config.json";

export async function sendVendaLog(vendaData: {
  userId: string;
  produtoId: string;
  grupoId: string;
  capitulos: string | number | number[];
  precoUnitario: number;
}) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = logsConfig.logChannelId;

  if (!token || !channelId) {
    console.error("Discord token or channel ID missing for logging.");
    return;
  }

  try {
    // Busca informações detalhadas para o log
    const [user, produto, grupo] = await Promise.all([
      prisma.users.findUnique({ where: { id: vendaData.userId }, select: { discord_username: true } }),
      prisma.produtos.findUnique({ where: { id: vendaData.produtoId }, select: { nome: true, imagem_url: true } }),
      prisma.grupos.findUnique({ where: { id: vendaData.grupoId }, select: { nome: true, channel_id: true } }),
    ]);

    if (!user || !produto || !grupo) {
        console.warn("Could not find user, produto or grupo for logging.");
        return;
    }

    let capitulosTexto = "";
    let count = 1;
    if (Array.isArray(vendaData.capitulos)) {
        count = vendaData.capitulos.length;
        if (count > 10) {
            capitulosTexto = `\`${vendaData.capitulos[0]} a ${vendaData.capitulos[vendaData.capitulos.length - 1]}\` (${count} caps)`;
        } else {
            capitulosTexto = vendaData.capitulos.map(c => `\`${c}\``).join(", ");
        }
    } else {
        capitulosTexto = `\`${vendaData.capitulos}\``;
    }

    const total = (Number(vendaData.precoUnitario) || 0) * count;
    const valorTexto = count > 1 
        ? `$ ${vendaData.precoUnitario.toFixed(2)} x ${count} = **$ ${total.toFixed(2)}**`
        : `**$ ${vendaData.precoUnitario.toFixed(2)}**`;

    const channelMention = grupo.channel_id ? `<#${grupo.channel_id}>` : "N/A";

    const embed = {
      title: "📄 Log de Venda",
      color: 0x8b5cf6, // Cor roxa baseada na imagem
      fields: [
        { name: "👤 Vendedor", value: user.discord_username, inline: true },
        { name: "📍 Grupo", value: grupo.nome, inline: true },
        { name: "🌐 Canal", value: channelMention, inline: true },
        { name: "📖 Série", value: produto.nome, inline: true },
        { name: "📕 Capítulos", value: capitulosTexto, inline: true },
        { name: "💰 Valor", value: valorTexto, inline: true },
      ],
      thumbnail: produto.imagem_url ? { url: produto.imagem_url } : undefined,
      timestamp: new Date().toISOString(),
    };

    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { embeds: [embed] },
      {
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar log para o Discord:", error?.response?.data || error.message);
  }
}
