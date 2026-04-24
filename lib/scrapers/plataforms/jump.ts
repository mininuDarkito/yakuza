import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // Passando headers para simular um navegador real e evitar bloqueios da Shueisha
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // Capturando Título Bruto (ex: "怪獣ネコパンチ | ジャンプTOON")
  const tituloBruto = $('meta[property="og:title"]').attr('content') || "";
  
  // Limpando o título: quebra a string no " | " e pega apenas o nome da obra
  const tituloLimpo = tituloBruto.split(' | ')[0].trim();
  
  // Capturando Descrição Bruta
  let descricao = $('meta[property="og:description"]').attr('content') || null;
  
  // (Opcional) Limpando o texto promocional que o JumpToon coloca no início de todas as sinopses
  // Ex: "【初回全話無料】 | 最新話を読む | 今年も「ネコドン」襲来の季節..."
  if (descricao) {
      descricao = descricao.replace(/【.*?】\s*\|\s*.*?\s*\|\s*/, '').trim();
  }
  
  // Capturando a Imagem (og:image)
  const imagem_url = $('meta[property="og:image"]').attr('content') || null;
  
  return {
    nome: tituloLimpo,
    descricao: descricao,
    imagem_url: imagem_url,
    plataforma: 'JUMPTOON' // Selo padronizado em CAIXA ALTA
  };
}