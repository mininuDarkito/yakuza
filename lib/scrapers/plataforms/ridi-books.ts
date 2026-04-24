import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

export async function scrape(url: string): Promise<ScrapeResult> {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(html);
    const nome = ($('meta[property="og:title"]').attr('content') || "").split(' - ')[0].trim();
    
    let imagem = $('meta[property="og:image"]').attr('content')?.split('#')[0] || null;
    const srcSet = $('img').filter((i, el) => $(el).attr('alt') === nome).attr('srcset');
    
    if (srcSet) {
        const urls = srcSet.split(',').map(s => s.trim().split(' ')[0]);
        const highRes = urls.find(u => u.includes('xxlarge'));
        if (highRes) imagem = highRes.split('#')[0];
    }

    return {
        nome,
        descricao: $('meta[property="og:description"]').attr('content') || null,
        imagem_url: imagem,
        plataforma: 'ridi books'
    };
}