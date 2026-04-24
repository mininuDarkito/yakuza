import { NextResponse } from "next/server";
import axios from "axios";
import AdmZip from "adm-zip";

export async function POST(req: Request) {
  try {
    const { idObra, capitulos } = await req.json();
    
    let listaCaps: number[] = [];
    const inputStr = String(capitulos).trim();

    if (inputStr.includes("-")) {
      const [inicio, fim] = inputStr.split("-").map(Number);
      for (let i = inicio; i <= fim; i++) listaCaps.push(i);
    } else if (inputStr.includes(",")) {
      listaCaps = inputStr.split(",").map(Number);
    } else {
      listaCaps.push(Number(inputStr));
    }

    const zipFinal = new AdmZip();
    const baseUrl = "https://storage.vexmanga.com/public/upload/raws/kakaopage";
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" };

    for (const cap of listaCaps) {
      try {
        const urlZipOriginal = `${baseUrl}/${idObra}/${cap}/Episode-stitchedv2-${cap}-w800-q100.zip`;
        
        const response = await axios.get(urlZipOriginal, { 
            responseType: 'arraybuffer', 
            headers,
            timeout: 60000 
        });

        // --- LÓGICA DE EXTRAÇÃO (OPÇÃO B ATIVADA) ---
        // Abrimos o ZIP que acabamos de baixar
        const zipCap = new AdmZip(Buffer.from(response.data));
        const entries = zipCap.getEntries();

        // Para cada imagem dentro do ZIP do Kakao, adicionamos ao ZIP Final
        entries.forEach(entry => {
            if (!entry.isDirectory) {
                // Criamos o caminho: Capitulo-X/imagem.jpg
                const pathInZip = `Capitulo-${cap}/${entry.entryName}`;
                zipFinal.addFile(pathInZip, entry.getData());
            }
        });

      } catch (err: any) {
        console.error(`❌ Falha no capítulo ${cap}:`, err.message);
      }
    }

    const zipBuffer = zipFinal.toBuffer();

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="kakao_${idObra}_caps_${inputStr}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}