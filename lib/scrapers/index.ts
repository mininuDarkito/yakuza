// lib/scrapers/index.ts
import { uploadImage } from "../storage";

// 1. Definição da Interface
export interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
  nome_alternativo?: string | null;
}

// 2. Importação dos Scrapers
import { scrape as scrapeAcqq } from "./plataforms/acqq";
import { scrape as scrapeKakao } from "./plataforms/kakao-page";
import { scrape as scrapeKkmh } from "./plataforms/kuaikan";
import { scrape as scrapeManta } from "./plataforms/manta";
import { scrape as scrapeMecha } from "./plataforms/mechacomic";
import { scrape as scrapeRidi } from "./plataforms/ridi-books";
import { scrape as scrapeBilibili } from "./plataforms/piccoma";
import { scrape as scrapeHonto } from "./plataforms/honto";
import { scrape as scrapeComico } from "./plataforms/comico";
import { scrape as scrapeJump } from "./plataforms/jump";
import { scrape as scrapeComicfest } from "./plataforms/comicfest";
import { scrape as scrapeBookwalker } from "./plataforms/bookwalker";
import { scrape as scrapeEbookjapan } from "./plataforms/ebookjapan";
import { scrape as scrapeCmoa } from "./plataforms/cmoa";

// 3. A Função Resolver (O Cérebro agora mora aqui)
export async function resolveMetadata(url: string): Promise<ScrapeResult> {
  let result: ScrapeResult;

  if (url.includes("ac.qq.com")) result = await scrapeAcqq(url);
  else if (url.includes("manta.net")) result = await scrapeManta(url);
  else if (url.includes("ridibooks.com")) result = await scrapeRidi(url);
  else if (url.includes("kuaikanmanhua.com")) result = await scrapeKkmh(url);
  else if (url.includes("kakao.com")) result = await scrapeKakao(url);
  else if (url.includes("mechacomic.jp")) result = await scrapeMecha(url);
  else if (url.includes("piccoma.com")) result = await scrapeBilibili(url);
  else if (url.includes("honto.jp")) result = await scrapeHonto(url);
  else if (url.includes("comico.jp")) result = await scrapeComico(url);
  else if (url.includes("jumptoon.com")) result = await scrapeJump(url);
  else if (url.includes("comic.iowl.jp")) result = await scrapeComicfest(url);
  else if (url.includes("bookwalker.jp")) result = await scrapeBookwalker(url);
  else if (url.includes("ebookjapan.yahoo.co.jp"))
    result = await scrapeEbookjapan(url);
  else if (url.includes("cmoa.jp")) result = await scrapeCmoa(url);
  else throw new Error("Plataforma não suportada ou link inválido.");

  // Centraliza o upload de imagem aqui para evitar Base64 no banco de dados
  if (result.imagem_url) {
    result.imagem_url = await uploadImage(result.imagem_url);
  }

  return result;
}
