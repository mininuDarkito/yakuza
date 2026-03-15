import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ScrapeResult } from '../index';

async function imageToProcessedBase64(url: string): Promise<string | null> {
    try {
        // --- CONFIGURAÇÃO DA PROXY (Puxando do seu .env) ---
        const PROXY_USER = process.env.PROXY_USER || "";
        const PROXY_PASS = process.env.PROXY_PASS || "";
        const PROXY_HOST = process.env.PROXY_HOST || "";
        const PROXY_PORT = process.env.PROXY_PORT || "";

        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
        const agent = new HttpsProxyAgent(proxyUrl);

        // 1. ACESSA E BAIXA O ARQUIVO (Binário)
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            httpsAgent: agent,
            headers: {
                'Referer': 'https://piccoma.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        // 2. LOGICA DE RENOMEAR/EXTENSÃO
        // Pegamos os dados binários (Buffer)
        const buffer = Buffer.from(response.data);
        
        // No momento de passar para o imagem_url, forçamos o MIME type como image/png 
        // para simular que o arquivo foi renomeado/convertido como você pediu no Python
        const base64String = buffer.toString('base64');
        return `data:image/png;base64,${base64String}`;

    } catch (error) {
        console.error("❌ Erro ao processar imagem Piccoma:", error);
        return null;
    }
}

export async function scrape(url: string): Promise<ScrapeResult> {
    // Configura o agente de Proxy para a navegação inicial
    const PROXY_USER = process.env.PROXY_USER || "";
    const PROXY_PASS = process.env.PROXY_PASS || "";
    const PROXY_HOST = process.env.PROXY_HOST || "";
    const PROXY_PORT = process.env.PROXY_PORT || "";
    const agent = new HttpsProxyAgent(`http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`);

    // Headers para parecer um japonês real
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://piccoma.com/web/',
        'DNT': '1'
    };

    try {
        // Primeiro visitamos a home para ganhar o cookie (igual ao seu Python)
        await axios.get("https://piccoma.com/web/", { headers, httpsAgent: agent });

        // Agora acessamos o produto
        const { data } = await axios.get(url, { headers, httpsAgent: agent });
        const $ = cheerio.load(data);

        // Título (Lógica do split para remover o "｜ピッコマ")
        const fullTitle = $('title').text();
        const nome = fullTitle === "ピッコマ" ? "Bloqueio detectado" : fullTitle.split(/｜|\|/)[0].trim();

        // Seletor da imagem de capa
        const imgTag = $('.PCM-productThum_img img').attr('src') || $('img[class*="productThum"]').attr('src');
        let capaUrl = imgTag;
        if (capaUrl && capaUrl.startsWith('//')) capaUrl = `https:${capaUrl}`;

        return {
            nome,
            descricao: $('meta[name="description"]').attr('content')?.trim() || "Sem descrição.",
            // CHAMA A FUNÇÃO QUE BAIXA, "RENOMEIA" E CONVERTE
            imagem_url: capaUrl ? await imageToProcessedBase64(capaUrl) : null,
            plataforma: 'PICCOMA'
        };

    } catch (error: any) {
        console.error("❌ Erro no scraper Piccoma:", error.message);
        throw error;
    }
}