// lib/scrapers/index.ts

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
import { scrape as scrapeBilibili }  from "./plataforms/bilibili";

// 3. A Função Resolver (O Cérebro agora mora aqui)
export async function resolveMetadata(url: string): Promise<ScrapeResult> {
  if (url.includes("ac.qq.com")) return await scrapeAcqq(url);
  if (url.includes("manta.net")) return await scrapeManta(url);
  if (url.includes("ridibooks.com")) return await scrapeRidi(url);
  if (url.includes("kuaikanmanhua.com")) return await scrapeKkmh(url);
  if (url.includes("kakao.com")) return await scrapeKakao(url);
  if (url.includes("mechacomic.jp")) return await scrapeMecha(url);
  if (url.includes("manga.bilibili.com")) return await scrapeBilibili(url);
  
  throw new Error("Plataforma não suportada ou link inválido.");
}