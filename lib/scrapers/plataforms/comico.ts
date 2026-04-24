import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // O Comico também pode bloquear requisições sem User-Agent
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // Capturando Título Bruto (ex: "サレ夫人の逆行復讐 | comico (コミコ)")
  const tituloBruto = $('meta[property="og:title"]').attr('content') || "";
  
  // Limpando o título: quebra a string no " | " e pega apenas a primeira parte
  const tituloLimpo = tituloBruto.split(' | ')[0].trim();
  
  // Capturando Descrição (Preserva as quebras de linha do HTML)
  const descricao = $('meta[property="og:description"]').attr('content') || null;
  
  // Capturando a Imagem: Tenta pegar do twitter:image primeiro, com fallback pro og:image
  const imagem_url = $('meta[name="twitter:image"]').attr('content') || 
                     $('meta[property="og:image"]').attr('content') || 
                     null;
  
  return {
    nome: tituloLimpo,
    descricao: descricao,
    imagem_url: imagem_url,
    plataforma: 'COMICO' // Em maiúsculo para manter o padrão das Badges
  };
}