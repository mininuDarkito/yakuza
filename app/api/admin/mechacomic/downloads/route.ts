import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  downloadAndProcessChapter,
  CryptoProcessor,
} from "@/lib/mechacomic/engine";
import { processAndStitchImages } from "@/lib/mechacomic/image-processor";
import { GoogleDriveUploader } from "@/lib/mechacomic/drive";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import os from "os";
const archiver = require("archiver");

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");

    if (chapterId) {
      const downloads = await (prisma as any).mecha_downloads.findMany({
        where: { chapter_id: chapterId },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json(downloads);
    }

    const downloads = await (prisma as any).mecha_downloads.findMany({
      take: 20,
      orderBy: { created_at: "desc" },
      include: {
        chapter: { include: { series: true } },
        user: true,
      },
    });
    return NextResponse.json(downloads);
  } catch (error: any) {
    console.error("Erro ao listar downloads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { chapterIds, stitchMode = true } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Não autorizado ou ID do usuário não encontrado na sessão" },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    if (!chapterIds || !chapterIds.length) {
      return NextResponse.json(
        { error: "chapterIds são obrigatórios" },
        { status: 400 },
      );
    }

    // Cria os registros de download como 'pending'
    const downloads = [];
    for (const chapterId of chapterIds) {
      const download = await (prisma as any).mecha_downloads.create({
        data: {
          chapter_id: chapterId,
          user_id: userId,
          stitch_mode: stitchMode,
          status: "pending",
        },
      });
      downloads.push(download);

      // Inicia o processamento em background (fire and forget)
      processDownload(download.id, chapterId, stitchMode).catch(console.error);
    }

    return NextResponse.json({ success: true, downloads });
  } catch (error: any) {
    console.error("Erro ao iniciar download:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Background processor
async function processDownload(
  downloadId: string,
  chapterId: string,
  stitchMode: boolean,
) {
  try {
    await (prisma as any).mecha_downloads.update({
      where: { id: downloadId },
      data: { status: "processing" },
    });

    const chapter = await (prisma as any).mecha_chapters.findUnique({
      where: { id: chapterId },
      include: { series: true },
    });

    if (!chapter) throw new Error("Capítulo não encontrado");

    // 1. Scrape via Playwright
    const result = (await downloadAndProcessChapter(
      chapter.mecha_id,
      chapter.series.title,
      chapter.chapter_title || chapter.chapter_number || "Capítulo",
      stitchMode,
    )) as any;

    if (result.error || !result.jsonData || !result.cryptoKey) {
      throw new Error(
        result.error || "Erro ao obter JSON ou Chave Criptográfica",
      );
    }

    const jsonData = result.jsonData;
    const cryptoKey = result.cryptoKey;

    // 2. Baixar imagens e decriptar (Paralelizado por lotes de 15 com retry)
    const pages = jsonData.pages || [];
    const imageBuffers: Buffer[] = [];
    const BATCH_SIZE = 200;

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const chunk = pages.slice(i, i + BATCH_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (pageInfo: any) => {
          const imgKey = pageInfo.image;
          if (!imgKey) return null;

          const imgOpts = jsonData.images[imgKey] || [];
          const opt = imgOpts.find((o: any) => o.format === "webp") || imgOpts[0];
          const imgUrl = jsonData.base_dir + opt.src;

          try {
            const encData = await fetchImageWithRetry(imgUrl);
            return CryptoProcessor.decryptMechaComic(encData, cryptoKey);
          } catch (e: any) {
            console.error(`Falha persistente ao baixar imagem ${imgUrl} após todas as tentativas:`, e);
            throw new Error(`Falha ao baixar a página do mangá: ${e.message}`);
          }
        })
      );

      for (const res of chunkResults) {
        if (res !== null) {
          imageBuffers.push(res);
        }
      }
    }

    if (imageBuffers.length === 0) {
      throw new Error("Nenhuma imagem baixada com sucesso.");
    }

    // 3. Processar imagens (Stitch ou apenas JPG)
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `mecha_${downloadId}`),
    );
    const prefix = `${chapter.series.title.replace(/[^a-z0-9]/gi, "_")}_${chapter.chapter_number || "Cap"}`;

    const savedFiles = await processAndStitchImages(
      imageBuffers,
      prefix,
      tempDir,
      stitchMode,
    );

    // 4. Salvar ZIP localmente (Lógica do server.py)
    // Usamos variável de ambiente ou fallback para evitar erro de rastreio no build
    const baseSavePath = process.env.MECHA_SAVE_PATH || "C:\\YakuzaRaws";
    const site = "mechacomic";
    const seriesSafe =
      chapter.series.title.replace(/[<>:"/\\|?*\x00]/g, "").trim() ||
      "Sem_Titulo";

    // Combina número e título, limpando os parênteses do final (ex: (15) -> "")
    let fullChapterName = (chapter.chapter_number || "Cap").trim();
    if (chapter.chapter_title) {
      const cleanTitle = chapter.chapter_title.replace(/\s*\(\d+\)\s*$/, "").trim();
      fullChapterName = `${fullChapterName} - ${cleanTitle}`;
    }
    const chapterSafe = fullChapterName
      .replace(/:/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[<>"/\\|?*\x00]/g, "")
      .trim();

    const localFolder = path.join(baseSavePath, site, seriesSafe);
    fs.mkdirSync(localFolder, { recursive: true });

    const zipFilePath = path.join(localFolder, `${chapterSafe}.zip`);
    const output = fs.createWriteStream(zipFilePath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      for (const file of savedFiles) {
        archive.file(file, { name: path.basename(file) });
      }
      archive.finalize();
    });

    // 5. Upload para Google Drive (Modo Pasta com imagens individuais)
    const drive = await GoogleDriveUploader.create();
    // Você pode colocar o ID da pasta raiz do seu drive aqui se quiser, ou deixar vazio para jogar na raiz
    const driveLink = await drive.uploadChapterImages(
      savedFiles,
      site,
      seriesSafe,
      chapterSafe,
    );

    // Limpar temporários apenas da pasta temp
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Atualizar status final
    await (prisma as any).mecha_downloads.update({
      where: { id: downloadId },
      data: { status: "completed", drive_link: driveLink },
    });
  } catch (e: any) {
    console.error(`Erro no download ${downloadId}:`, e);
    await (prisma as any).mecha_downloads.update({
      where: { id: downloadId },
      data: { status: "failed", error: e.message },
    });
  }
}

async function fetchImageWithRetry(imgUrl: string, maxRetries = 4, delayMs = 1500): Promise<Buffer> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 segundos de limite de conexão

      const resp = await fetch(imgUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`Status ${resp.status} ${resp.statusText}`);
      }

      const arrayBuf = await resp.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (error: any) {
      if (attempt >= maxRetries) {
        console.error(`[Fetch Failed] Falha persistente após ${attempt} tentativas para ${imgUrl}:`, error);
        throw error;
      }
      const backoffDelay = delayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(`[Fetch Retry] Tentativa ${attempt} falhou para ${imgUrl}. Retentando em ${Math.round(backoffDelay)}ms. Erro: ${error.message || error}`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

