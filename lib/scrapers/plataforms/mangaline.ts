import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ScrapeResult } from '../index';

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
                'Referer': 'https://manga.line.me/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        const buffer = Buffer.from(response.data);
        const base64String = buffer.toString('base64');
        return `data:image/png;base64,${base64String}`;

    } catch (error) {
        console.error("❌ Erro ao processar imagem LINE Manga:", error);
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
        'Referer': 'https://manga.line.me/',
        'DNT': '1'
    };

    try {
        const { data } = await axios.get(url, { headers, httpsAgent: agent });
        const $ = cheerio.load(data);

        // --- TÍTULO ---
        // Ex: 【5話無料】病弱ママですが、闇落ち息子を育ててみせます！｜漫画無料・試し読み｜LINE マンガ
        let nome = $('title').text().trim();
        // Remove o sufixo LINE Manga
        nome = nome.split(/｜|\|/)[0].trim();
        // Remove prefixos como 【5話無料】 ou 【10話無料】
        nome = nome.replace(/【\d+話無料】/g, '').trim();

        // --- DESCRIÇÃO ---
        // Ex: Título|Sinopse...
        const rawDescription = $('meta[name="description"]').attr('content') || "";
        const descricao = rawDescription.includes('|') 
            ? rawDescription.split('|').slice(1).join('|').trim() 
            : rawDescription.trim();

        // --- IMAGEM ---
        const capaUrl = $('meta[name="twitter:image"]').attr('content') || $('meta[property="og:image"]').attr('content');

        return {
            nome,
            descricao: descricao || "Sem descrição.",
            imagem_url: capaUrl ? await imageToProcessedBase64(capaUrl) : null,
            plataforma: 'MANGALINE'
        };

    } catch (error: any) {
        console.error("❌ Erro no scraper LINE Manga:", error.message);
        throw error;
    }
}
