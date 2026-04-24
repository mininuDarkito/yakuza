import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // O BookWalker tem proteção moderada, o User-Agent e o Accept-Language são obrigatórios
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // 1. Capturando Título Bruto (Tenta o twitter:title primeiro, depois og:title)
  const tituloBruto = $('meta[name="twitter:title"]').attr('content') || 
                      $('meta[property="og:title"]').attr('content') || 
                      "";
  
  // 2. Limpeza Avançada de Título
  // Remove marcações como 【タテスク】, （タテスクコミック）, [巻] etc.
  const tituloLimpo = tituloBruto
    .replace(/【.*?】/g, '') // Remove colchetes grossos japoneses
    .replace(/（.*?）/g, '') // Remove parênteses largos japoneses
    .replace(/\(.*?\)/g, '') // Remove parênteses normais (caso usem)
    .trim();
  
  // 3. Capturando Descrição
  const descricao = $('meta[property="og:description"]').attr('content') || null;
  
  // 4. Capturando a Imagem de alta qualidade
  const imagem_url = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     null;
  
  return {
    nome: tituloLimpo,
    descricao: descricao,
    imagem_url: imagem_url,
    plataforma: 'BOOKWALKER' // Badge padronizada
  };
}