import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from "../index";

export async function scrape(url: string): Promise<ScrapeResult> {
  const headers = {
    "User-Agent": "Twitterbot/1.0",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.lezhin.com/",
    DNT: "1",
  };

  try {
    const { data } = await axios.get(url, { headers });
    const $ = cheerio.load(data);

    // --- TÍTULO ---
    // Ex: 동정남 보건 선생님 - 냉탕킹 - 웹툰 - 레진코믹스
    let nome =
      $('meta[name="twitter:title"]').attr("content") ||
      $('meta[property="og:title"]').attr("content") ||
      "";
    nome = nome.split(" - ")[0].trim();

    // --- DESCRIÇÃO ---
    const descricao =
      $('meta[name="description"]').attr("content")?.trim() || "Sem descrição.";

    // --- IMAGEM ---
    const capaUrl = $('meta[name="twitter:image"]').attr("content");

    return {
      nome,
      descricao,
      imagem_url: capaUrl || null,
      plataforma: "LEZHIN",
    };
  } catch (error: any) {
    console.error("❌ Erro no scraper Lezhin:", error.message);
    throw error;
  }
}
