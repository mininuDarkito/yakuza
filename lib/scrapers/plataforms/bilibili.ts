import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: { 'Referer': 'https://manga.bilibili.com/' } 
    });
    const buffer = Buffer.from(response.data, 'binary');
    return `data:${response.headers['content-type']};base64,${buffer.toString('base64')}`;
  } catch { return url; }
}

export async function scrape(url: string): Promise<ScrapeResult> {
  try {
    // 1. Acessamos a página de detalhes com Headers de "Social Media Bot"
    // Isso força a Bilibili a entregar o HTML com Meta Tags populadas
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Twitterbot/1.1; +https://dev.twitter.com/cards/optimize)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(html);

    // 2. Captura via Meta Tags (Onde o SEO guarda os dados)
    const nome = $('meta[property="og:title"]').attr('content') || 
                 $('meta[name="twitter:title"]').attr('content') ||
                 $('title').text().replace('_哔哩哔哩漫画', '').trim();

    const descricao = $('meta[property="og:description"]').attr('content') || 
                      $('meta[name="description"]').attr('content');

    let rawCapaUrl = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content');

    // 3. Validação Crítica
    if (!nome || nome === "哔哩哔哩漫画" || nome === "Bilibili Manga") {
       throw new Error("O servidor da Bilibili entregou uma página genérica (Bot detectado).");
    }

    // Limpeza da imagem e conversão
    if (rawCapaUrl && rawCapaUrl.includes('@')) {
      rawCapaUrl = rawCapaUrl.split('@')[0];
    }
    
    const imagemFinal = rawCapaUrl ? await imageToBase64(rawCapaUrl) : null;

    return {
      nome: nome.trim(),
      descricao: (descricao || "Sem descrição disponível.").trim(),
      imagem_url: imagemFinal,
      plataforma: 'BILIBILI'
    };

  } catch (error: any) {
    console.error(`❌ Erro Bilibili (SEO Mode): ${error.message}`);
    throw new Error(`Falha ao acessar Bilibili Manga: ${error.message}`);
  }
}