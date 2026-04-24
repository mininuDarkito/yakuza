import axios from "axios";
import * as cheerio from "cheerio";

// Adicione esta interface para o TypeScript entender o retorno
interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const { data: html } = await axios.get(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja-JP' } 
  });
  const $ = cheerio.load(html);
  const titulo = $('meta[property="og:title"]').attr('content') || "";
  
  return {
    nome: titulo.replace(/【.*?】/g, '').split(' - ')[0].trim(),
    descricao: $('meta[property="og:description"]').attr('content') || null,
    imagem_url: $('meta[name="twitter:image"]').attr('content') || null,
    plataforma: 'mechacomic'
  };
}