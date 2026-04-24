import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // Passando um User-Agent de navegador real, pois alguns sites JP bloqueiam acessos secos
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // Capturando Título (og:title no Honto costuma vir bem limpo)
  const titulo = $('meta[property="og:title"]').attr('content') || "";
  
  // Capturando Descrição
  const descricao = $('meta[property="og:description"]').attr('content') || null;
  
  // Capturando a Imagem: Prioriza o WebP no <source>, se falhar pega o JPG no <img>
  let imagem_url = $('.stCover picture source').attr('srcset') || 
                   $('.stCover picture img').attr('src') || 
                   null;
  
  return {
    nome: titulo.trim(),
    descricao: descricao,
    imagem_url: imagem_url,
    plataforma: 'HONTO' // Padronizado em maiúsculo para combinar com as Badges da Yakuza Raws
  };
}