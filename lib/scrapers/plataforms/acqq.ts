import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapeResult } from '../index';

async function imageToBase64(url: string): Promise<string> {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            headers: { 'Referer': 'https://ac.qq.com/' } 
        });
        const buffer = Buffer.from(response.data, 'binary');
        return `data:${response.headers['content-type']};base64,${buffer.toString('base64')}`;
    } catch { return url; }
}

export async function scrape(url: string): Promise<ScrapeResult> {
    // --- NORMALIZAÇÃO DO LINK ---
    // Se o link for do leitor (ComicView), transforma em link de informações (Comic/comicInfo)
    let targetUrl = url;
    if (url.includes('ComicView')) {
        const match = url.match(/\/id\/(\d+)/);
        if (match && match[1]) {
            targetUrl = `https://ac.qq.com/Comic/comicInfo/id/${match[1]}`;
        }
    }

    const { data } = await axios.get(targetUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        } 
    });

    const $ = cheerio.load(data);
    
    const nome = $('.works-intro-title strong').text().trim();
    const capaUrl = $('.works-cover img').attr('src');
    
    return {
        nome,
        descricao: $('.works-intro-short').text().trim() || "Sem descrição.",
        imagem_url: capaUrl ? await imageToBase64(capaUrl) : null,
        plataforma: 'ACQQ'
    };
}