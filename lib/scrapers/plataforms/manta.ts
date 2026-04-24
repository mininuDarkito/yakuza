import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

export async function scrape(url: string): Promise<ScrapeResult> {
    const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(html);
    const nome = ($('meta[name="twitter:title"]').attr('content') || "").split(' - ')[0].trim();
    let desc = $('meta[property="og:description"]').attr('content') || "";
    
    if (desc.includes(nome)) desc = desc.split(`${nome}.`)[1]?.trim() || desc;

    return {
        nome,
        descricao: desc || null,
        imagem_url: $('meta[name="twitter:image"]').attr('content') || null,
        plataforma: 'manta'
    };
}