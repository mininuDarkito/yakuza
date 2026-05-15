import { NextResponse } from "next/server";
import axios from "axios";
import AdmZip from "adm-zip";

export async function POST(req: Request) {
  try {
    const { urlMestra, totalImagens } = await req.json();

    // 1. Identificar o Prefixo e o Sufixo da URL protegida
    // Ex: https://.../contents/scrolls/1.webp?Policy=...
    const [prefix, suffix] = urlMestra.split("1.webp");
    
    if (!prefix || !suffix) {
      return NextResponse.json({ error: "URL inválida ou fora do padrão Lezhin" }, { status: 400 });
    }

    const zip = new AdmZip();
    const headers = { 
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      "Referer": "https://www.lezhin.com/" 
    };

    console.log(`🚀 Iniciando captura Lezhin: ${totalImagens} imagens.`);

    // 2. Loop para baixar cada imagem sequencialmente
    for (let i = 1; i <= totalImagens; i++) {
      try {
        // zfill(2) -> transforma 1 em 01, 2 em 02...
        const num = String(i).padStart(2, '0');
        const urlFinal = `${prefix}${num}.webp${suffix}`;

        const response = await axios.get(urlFinal, {
          responseType: 'arraybuffer',
          headers,
          timeout: 15000 // 15s por imagem
        });

        // Adiciona a imagem ao ZIP
        zip.addFile(`${num}.webp`, Buffer.from(response.data));
        
        console.log(`✅ Baixada: ${num}.webp`);
      } catch (err: any) {
        console.error(`❌ Erro na imagem ${i}:`, err.message);
        // Se uma imagem falhar (ex: fim do capítulo), paramos o loop
        break; 
      }
    }

    const zipBuffer = zip.toBuffer();

    // 3. Retorno do arquivo ZIP
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="lezhin_download.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}