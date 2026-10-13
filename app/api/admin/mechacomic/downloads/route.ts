import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  downloadAndProcessChapter,
  CryptoProcessor,
  getAccountInfo,
} from "@/lib/mechacomic/engine";
import { processAndStitchImages } from "@/lib/mechacomic/image-processor";
import { GoogleDriveUploader } from "@/lib/mechacomic/drive";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMechaComicLog } from '@/lib/mechacomic/logger';
import { sendMechaComicLog } from '@/lib/discord-logger';
import fs from "fs";
import path from "path";
import os from "os";
const archiver = require("archiver");

// Limite de downloads simultâneos para evitar estouro de memória, CPU e travamentos no MechaComic
const MAX_CONCURRENT_DOWNLOADS = 5;
let isProcessingQueue = false;

async function triggerQueueProcessor() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    // Limpa downloads que ficaram travados em 'processing' há mais de 5 minutos (ex: reinício de dev server ou travamento)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await (prisma as any).mecha_downloads.updateMany({
      where: {
        status: "processing",
        updated_at: { lt: fiveMinutesAgo },
      },
      data: {
        status: "failed",
        error: "Download interrompido por tempo limite de processamento ou reinício do servidor.",
      },
    });

    while (true) {
      // 1. Conta quantos downloads estão sendo processados agora
      const activeCount = await (prisma as any).mecha_downloads.count({
        where: { status: "processing" },
      });

      if (activeCount >= MAX_CONCURRENT_DOWNLOADS) {
        break; // Limite de concorrência atingido
      }

      // 2. Busca o próximo download pendente mais antigo
      const nextDownload = await (prisma as any).mecha_downloads.findFirst({
        where: { status: "pending" },
        orderBy: { created_at: "asc" },
      });

      if (!nextDownload) {
        break; // Nenhum item pendente na fila
      }

      // 3. Marca imediatamente como processing para não ser pego por outra iteração
      await (prisma as any).mecha_downloads.update({
        where: { id: nextDownload.id },
        data: { status: "processing" },
      });

      // 4. Inicia o download do item (ele próprio acionará a fila no final)
      processDownload(
        nextDownload.id,
        nextDownload.chapter_id,
        nextDownload.stitch_mode,
        nextDownload.user_id,
      ).catch((err) => {
        console.error("Erro na execução da fila:", err);
      });

      // Pequena pausa antes de checar se é possível pegar mais um até atingir o limite
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (error) {
    console.error("Erro no gerenciador da fila de downloads:", error);
  } finally {
    isProcessingQueue = false;
  }
}

export async function GET(req: Request) {
  try {
    // Aciona a fila sempre que houver consultas/polling para evitar trava em 'pending'
    triggerQueueProcessor().catch(console.error);

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
      take: 50,
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
  let userId = '';
  let chapterIds: string[] = [];
  let stitchMode = true;

  try {
    const body = await req.json();
    chapterIds = body.chapterIds;
    stitchMode = body.stitchMode ?? true;

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Não autorizado ou ID do usuário não encontrado na sessão" },
        { status: 401 },
      );
    }
    userId = session.user.id;

    if (!chapterIds || !chapterIds.length) {
      return NextResponse.json(
        { error: "chapterIds são obrigatórios" },
        { status: 400 },
      );
    }

    // Cria os registros de download como 'pending' na fila
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
    }

    await createMechaComicLog(userId, 'download-api-created', {
      chapterIds,
      stitchMode,
      downloadIds: downloads.map((download) => download.id),
      totalQueued: downloads.length,
    });

    // Aciona a fila gerenciada (processa em segundo plano respeitando o limite)
    triggerQueueProcessor().catch(console.error);

    return NextResponse.json({
      success: true,
      message: `${downloads.length} capítulo(s) adicionado(s) à fila de downloads!`,
      downloads,
    });
  } catch (error: any) {
    console.error("Erro ao iniciar download:", error);
    if (userId) {
      await createMechaComicLog(userId, 'download-api-error', {
        chapterIds,
        stitchMode,
        error: error.message,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Background processor
async function processDownload(
  downloadId: string,
  chapterId: string,
  stitchMode: boolean,
  userId: string,
) {
  let chapter: any = null;
  let fullChapterName = "Desconhecido";
  let accountInfo: any = null;
  let userRecord: any = null;
  let driveLink: string | null = null;

  try {
    await createMechaComicLog(userId, 'download-processing', {
      downloadId,
      chapterId,
      stitchMode,
    });

    chapter = await (prisma as any).mecha_chapters.findUnique({
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

    // 2. Baixar imagens e decriptar (Paralelizado com retry)
    const pages = jsonData.pages || [];
    const imageBuffers: Buffer[] = [];
    const BATCH_SIZE = 500;

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

    // 4. Salvar ZIP localmente
    const baseSavePath = process.env.MECHA_SAVE_PATH || "C:\\YakuzaRaws";
    const site = "mechacomic";
    const seriesSafe =
      chapter.series.title.replace(/[<>:"/\\|?*\x00]/g, "").trim() ||
      "Sem_Titulo";

    fullChapterName = (chapter.chapter_number || "Cap").trim();
    if (chapter.chapter_title) {
      const cleanTitle = chapter.chapter_title.replace(/\s*\(\d+\)\s*$/, "").trim();
      fullChapterName = `${fullChapterName} - ${cleanTitle}`;
    }
    const chapterSafe = fullChapterName
      .replace(/:/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[<>"/\\|?*\x00]/g, "")
      .trim();

    const chapterFolderName = chapterSafe;
    const localFolder = path.join(baseSavePath, site, seriesSafe);
    fs.mkdirSync(localFolder, { recursive: true });

    const zipFilePath = path.join(localFolder, `${chapterSafe}-${chapter.id}.zip`);
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

    // 5. Upload para Google Drive
    const drive = await GoogleDriveUploader.create();
    driveLink = await drive.uploadChapterImages(
      savedFiles,
      site,
      seriesSafe,
      chapterFolderName,
    );

    // Limpar temporários
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Atualizar status final
    await (prisma as any).mecha_downloads.update({
      where: { id: downloadId },
      data: { status: "completed", drive_link: driveLink },
    });

    accountInfo = await getAccountInfo();
    userRecord = await (prisma as any).users.findUnique({
      where: { id: userId },
    });

    await createMechaComicLog(userId, 'download-completed', {
      downloadId,
      chapterId,
      driveLink,
      series: {
        id: chapter.series.id,
        title: chapter.series.title,
        thumbnail: chapter.series.cover_url,
      },
      chapter: {
        title: chapter.chapter_title || null,
        number: chapter.chapter_number || null,
        fullTitle: fullChapterName,
        cost: chapter.cost || null,
      },
      mechaAccount: {
        username: accountInfo?.username || null,
        currentPoints: accountInfo?.points || null,
      },
      user: {
        id: userId,
        discordUsername: userRecord?.discord_username || null,
        profileIcon: userRecord?.discord_avatar || null,
      },
      downloadedAt: new Date().toISOString(),
    });

    await sendMechaComicLog({
      userId,
      seriesTitle: chapter.series.title,
      seriesThumbnail: chapter.series.cover_url,
      chapterNumber: chapter.chapter_number || null,
      chapterTitle: chapter.chapter_title || null,
      chapterFullTitle: fullChapterName,
      cost: chapter.cost || null,
      driveLink,
      mechaAccountUsername: accountInfo?.username || null,
      mechaPoints: accountInfo?.points || null,
      downloadedAt: new Date().toISOString(),
      discordUsername: userRecord?.discord_username || null,
      profileIcon: userRecord?.discord_avatar || null,
      status: "completed",
    });
  } catch (e: any) {
    console.error(`Erro no download ${downloadId}:`, e);
    await (prisma as any).mecha_downloads.update({
      where: { id: downloadId },
      data: { status: "failed", error: e.message },
    });
    await createMechaComicLog(userId, 'download-failed', {
      downloadId,
      chapterId,
      error: e.message,
    });
    await sendMechaComicLog({
      userId,
      seriesTitle: chapter?.series?.title || "Desconhecido",
      seriesThumbnail: chapter?.series?.cover_url || null,
      chapterNumber: chapter?.chapter_number || null,
      chapterTitle: chapter?.chapter_title || null,
      chapterFullTitle: fullChapterName,
      cost: chapter?.cost || null,
      driveLink: driveLink || null,
      mechaAccountUsername: accountInfo?.username || null,
      mechaPoints: accountInfo?.points || null,
      downloadedAt: new Date().toISOString(),
      discordUsername: userRecord?.discord_username || null,
      profileIcon: userRecord?.discord_avatar || null,
      status: "failed",
      errorMessage: e.message,
    });
  } finally {
    // SEMPRE aciona a fila ao terminar um item (sucesso ou erro) para processar o próximo pendente
    triggerQueueProcessor().catch(console.error);
  }
}

async function fetchImageWithRetry(imgUrl: string, maxRetries = 4, delayMs = 1500): Promise<Buffer> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
