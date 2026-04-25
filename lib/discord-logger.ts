import axios from "axios";
import { prisma } from "./db";
import logsConfig from "../logs_config.json";

export async function sendVendaLog(vendaData: {
  userId: string;
  produtoId: string;
  grupoId: string;
  capitulos: string | number | number[];
  precoUnitario: number;
  dataVenda?: Date | string;
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
      prisma.produtos.findUnique({ where: { id: vendaData.produtoId }, select: { nome: true, imagem_url: true, plataforma: true } }),
      vendaData.grupoId 
        ? prisma.grupos.findUnique({ where: { id: vendaData.grupoId }, select: { nome: true, channel_id: true } })
        : Promise.resolve(null),
    ]);

    if (!user || !produto) {
        console.warn("Could not find user or produto for logging.");
        return;
    }

    // --- VERIFICAÇÃO DE BASE64 ---
    // Se a imagem ainda estiver em Base64 (registros antigos), convertemos para Cloudinary agora
    // e aproveitamos para atualizar o banco de dados permanentemente.
    if (produto.imagem_url && produto.imagem_url.startsWith('data:image')) {
        const { uploadImage } = await import("./storage");
        const newUrl = await uploadImage(produto.imagem_url);
        if (newUrl && !newUrl.startsWith('data:image')) {
            produto.imagem_url = newUrl;
            // Atualiza no banco para não precisar converter de novo no próximo log
            await prisma.produtos.update({
                where: { id: vendaData.produtoId },
                data: { imagem_url: newUrl }
            }).catch(e => console.error("Erro ao atualizar imagem Base64 no log:", e));
        }
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

    const grupoNome = grupo?.nome || "Sem Grupo";
    const channelMention = grupo?.channel_id ? `<#${grupo.channel_id}>` : "N/A";
    
    // Formatação de Datas
    const dataVendaObj = vendaData.dataVenda ? new Date(vendaData.dataVenda) : new Date();
    const dataVendaStr = dataVendaObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const dataRegistroStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const embed = {
      title: "📄 Log de Venda",
      color: 0x8b5cf6, // Cor roxa baseada na imagem
      fields: [
        { name: "👤 Vendedor", value: user.discord_username, inline: true },
        { name: "📍 Grupo", value: grupoNome, inline: true },
        { name: "🌐 Canal", value: channelMention, inline: true },
        { name: "📖 Série", value: produto.nome, inline: true },
        { name: "📕 Capítulos", value: capitulosTexto, inline: true },
        { name: "💰 Valor", value: valorTexto, inline: true },
        { name: "🌐 Plataforma", value: produto.plataforma?.toUpperCase() || "N/A", inline: true },
        { name: "📅 Data da Venda", value: dataVendaStr, inline: true },
        { name: "🕒 Data do Registro", value: dataRegistroStr, inline: true },
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
