import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  // O Yahoo Japan costuma bloquear acessos fora do Japão ou bots, 
  // então o Accept-Language japonês e o User-Agent são super importantes aqui.
  const { data: html } = await axios.get(url, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 
      'Accept-Language': 'ja-JP,ja;q=0.9' 
    } 
  });
  
  const $ = cheerio.load(html);
  
  // 1. Capturando Título Bruto
  // Ex: "【3話無料】その夫婦を破滅させるまで - 井上りさ子 - 無料漫画・試し読み！電子書籍通販 ebookjapan"
  const tituloBruto = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
  
  // 2. Limpeza Tripla no Título
  // Primeiro arranca os colchetes 【 】, depois quebra a string no primeiro traço " - " 
  // Isso descarta o autor e a propaganda no final, sobrando só o nome da obra.
  const tituloLimpo = tituloBruto
    .replace(/【.*?】/g, '')
    .split(' - ')[0]
    .trim();
  
  // 3. Capturando e Limpando a Descrição
  // Ex: "【無料試し読みあり ebookjapan】【3話無料】その夫婦を破滅させるまで。無料本・試し読みあり！..."
  let descricao = $('meta[property="og:description"]').attr('content') || null;
  
  if (descricao) {
      // Remove as tags chatas promocionais do começo
      descricao = descricao.replace(/【.*?】/g, '').trim();
      
      // Remove o slogan clássico do eBookJapan que fica sujando a sinopse
      descricao = descricao.replace(/無料本・試し読みあり！/g, '').trim();
      
      // O eBookJapan às vezes repete o título na descrição, podemos limpar também (opcional)
      if (descricao.startsWith(tituloLimpo + '。')) {
          descricao = descricao.replace(tituloLimpo + '。', '').trim();
      }
  }
  
  // 4. Capturando a Imagem
  // Essa URL da Akamai é rápida e de ótima qualidade para o seu card.
  const imagem_url = $('meta[property="og:image"]').attr('content') || null;
  
  return {
    nome: tituloLimpo,
    descricao: descricao,
    imagem_url: imagem_url,
    plataforma: 'EBOOKJAPAN' // Para ficar lindo na sua Badge!
  };
}