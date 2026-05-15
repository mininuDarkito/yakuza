import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

export async function scrape(url: string): Promise<ScrapeResult> {
    try {
        const { data: html } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': 'https://www.kuaikanmanhua.com/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(html);

        // 1. TRATAMENTO DO TÍTULO (NOME)
        // Original: 姐姐，今生我送你上路漫画｜官方在线漫画全集-快看
        const ogTitle = $('meta[property="og:title"]').attr('content') || "";
        let nomeLimpo = ogTitle.split('|')[0] // Pega antes do pipe |
                               .split('漫画｜')[0] // Caso o pipe seja diferente
                               .split('官方在线')[0] // Caso não tenha pipe
                               .replace(/漫画$/, '') // Remove o sufixo 'Manga'
                               .trim();

        // 2. TRATAMENTO DA SINOPSE (DESCRIÇÃO)
        // Original: 姐姐，今生我送你上路简介：上一世...
        const ogDesc = $('meta[property="og:description"]').attr('content') || "";
        let descLimpa = ogDesc;
        
        // Remove tudo que vem antes do "简介：" (incluindo o termo)
        if (ogDesc.includes('简介：')) {
            descLimpa = ogDesc.split('简介：')[1]?.trim();
        }

        // 3. CAÇADOR DE IMAGEM REAL (Bypass Lazy-loading)
        let imagemReal: string | null = null;
        $('img').each((_, el) => {
            const src = $(el).attr('src');
            const dataSrc = $(el).attr('data-src');

            if (src && src.includes('kkmh.com')) {
                imagemReal = src;
                return false; 
            }
            if (dataSrc && dataSrc.includes('kkmh.com')) {
                imagemReal = dataSrc;
                return false; 
            }
        });

        if (!imagemReal) {
            imagemReal = $('meta[property="og:image"]').attr('content') || null;
        }

        return {
            nome: nomeLimpo || "Título não encontrado",
            descricao: descLimpa || "Sem descrição disponível",
            imagem_url: imagemReal,
            plataforma: 'Kuaikan'
        };
    } catch (error: any) {
        throw new Error(`Erro ao acessar Kuaikan: ${error.message}`);
    }
}