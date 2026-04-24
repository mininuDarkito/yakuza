import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // Mantemos o User-Agent forte para evitar bloqueios de segurança
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // 1. Capturando a Imagem e o Título (Buscando o nó da imagem com parte da classe)
  // Ignoramos o "__xDgASq__" e buscamos apenas "title-summary-section-module"
  const imgNode = $('div[class*="title-summary-section-module"] img');
  const imagem_url = imgNode.attr('src') || $('meta[property="og:image"]').attr('content') || null;
  
  // 2. Capturando e Limpando o Título
  // O alt da imagem tem o título. Usamos og:title ou a tag <title> como plano B.
  const tituloBruto = imgNode.attr('alt') || $('meta[property="og:title"]').attr('content') || $('title').text() || "";
  
  // Remove qualquer coisa entre 【 】 (ex: 【フルカラー】) e pega o título real
  const tituloLimpo = tituloBruto.replace(/【.*?】/g, '').split('|')[0].trim();
  
  // 3. Capturando a Descrição (Superando a classe dinâmica)
  // Ignoramos o "__8vMc-a__" e buscamos classes que contenham "description-section-module" e "body"
  const descricao = $('div[class*="description-section-module"][class*="body"]').text().trim() || 
                    $('meta[property="og:description"]').attr('content') || 
                    null;
  
  return {
    nome: tituloLimpo,
    descricao: descricao || null, // Se vier string vazia, converte para null
    imagem_url: imagem_url,
    plataforma: 'COMICFEST' // Badge no padrão maiúsculo
  };
}