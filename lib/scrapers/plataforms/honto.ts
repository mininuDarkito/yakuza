import axios from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from 'https-proxy-agent';

interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

async function imageToProcessedBase64(url: string): Promise<string | null> {
    try {
        const PROXY_USER = process.env.PROXY_USER || "";
        const PROXY_PASS = process.env.PROXY_PASS || "";
        const PROXY_HOST = process.env.PROXY_HOST || "";
        const PROXY_PORT = process.env.PROXY_PORT || "";

        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
        const agent = new HttpsProxyAgent(proxyUrl);

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            httpsAgent: agent,
            headers: {
                'Referer': 'https://honto.jp/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        const buffer = Buffer.from(response.data);
        const base64String = buffer.toString('base64');
        return `data:image/png;base64,${base64String}`;

    } catch (error) {
        console.error("❌ Erro ao processar imagem HONTO:", error);
        return null;
    }
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const PROXY_USER = process.env.PROXY_USER || "";
  const PROXY_PASS = process.env.PROXY_PASS || "";
  const PROXY_HOST = process.env.PROXY_HOST || "";
  const PROXY_PORT = process.env.PROXY_PORT || "";
  const agent = new HttpsProxyAgent(`http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://honto.jp/',
    'DNT': '1'
  };

  try {
    const { data: html } = await axios.get(url, { headers, httpsAgent: agent });
    const $ = cheerio.load(html);
    
    // Capturando Título
    const titulo = $('meta[property="og:title"]').attr('content') || "";
    
    // Capturando Descrição
    const descricao = $('meta[property="og:description"]').attr('content') || null;
    
    // Capturando a Imagem
    let capaUrl = $('.stCover picture source').attr('srcset') || 
                  $('.stCover picture img').attr('src') || 
                  null;
    
    return {
      nome: titulo.trim(),
      descricao: descricao,
      imagem_url: capaUrl ? await imageToProcessedBase64(capaUrl) : null,
      plataforma: 'HONTO'
    };
  } catch (error: any) {
    console.error("❌ Erro no scraper HONTO:", error.message);
    throw error;
  }
}