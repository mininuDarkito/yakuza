import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapeResult } from '../index';
import { uploadImage } from '../../storage';

export async function scrape(url: string): Promise<ScrapeResult> {
    // --- NORMALIZAÇÃO DO LINK ---
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
    
    // Agora fazemos o upload da imagem em vez de converter para Base64
    const finalImageUrl = capaUrl ? await uploadImage(capaUrl) : null;

    return {
        nome,
        descricao: $('.works-intro-short').text().trim() || "Sem descrição.",
        imagem_url: finalImageUrl,
        plataforma: 'ACQQ'
    };
}