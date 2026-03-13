import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

export async function scrape(url: string): Promise<ScrapeResult> {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(html);
    
    return {
        nome: ($('meta[property="og:title"]').attr('content') || "").split(' - ')[0],
        descricao: $('meta[property="og:description"]').attr('content') || null,
        imagem_url: $('meta[property="og:image"]').attr('content') || null,
        plataforma: 'kakao page'
    };
}