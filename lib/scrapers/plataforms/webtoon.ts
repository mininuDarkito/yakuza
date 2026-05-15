import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from "../index";

export async function scrape(url: string): Promise<ScrapeResult> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.webtoons.com/",
    DNT: "1",
  };

  try {
    const { data } = await axios.get(url, { headers });
    const $ = cheerio.load(data);

    // --- TÍTULO ---
    const nome = $('meta[property="og:title"]').attr("content")?.trim() || "";

    // --- DESCRIÇÃO ---
    // Ex: Read The Postman of the Apocalypse Now! Digital comics on WEBTOON, EVERY FRIDAY. Jeongguk Woo...
    let descricao =
      $('meta[name="description"]').attr("content")?.trim() || "Sem descrição.";

    // Remove o boilerplate: "Read ... Now! Digital comics on WEBTOON, EVERY [DAY]. "
    const boilerplateMatch = descricao.match(
      /Digital comics on WEBTOON, EVERY \w+\.\s+/i,
    );
    if (boilerplateMatch) {
      descricao = descricao.split(boilerplateMatch[0])[1]?.trim() || descricao;
    }

    // --- IMAGEM ---
    const capaUrl = $('meta[property="og:image"]').attr("content");

    return {
      nome,
      descricao,
      imagem_url: capaUrl || null,
      plataforma: "WEBTOON",
    };
  } catch (error: any) {
    console.error("❌ Erro no scraper WEBTOON:", error.message);
    throw error;
  }
}
