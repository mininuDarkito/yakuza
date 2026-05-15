import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapeResult } from '../index';

export async function scrape(url: string): Promise<ScrapeResult> {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  });

  const $ = cheerio.load(html);

  const nome = $('meta[property="og:title"]').attr('content') || "";
  const descricao = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
  const imagem_url = $('meta[property="og:image"]').attr('content') || null;

  return {
    nome: nome.trim(),
    descricao: descricao ? descricao.trim() : null,
    imagem_url: imagem_url,
    plataforma: 'mrblue'
  };
}
