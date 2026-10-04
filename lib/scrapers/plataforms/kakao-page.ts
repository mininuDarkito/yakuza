import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapeResult } from '../index';

function formatKakaoImageUrl(rawThumb: string | null | undefined): string | null {
    if (!rawThumb) return null;
    if (rawThumb.startsWith('http://') || rawThumb.startsWith('https://')) return rawThumb;
    return `https://page-images.kakaoentcdn.com/download/resource?kid=${rawThumb}&filename=o1/dims/resize/384`;
}

export async function scrape(input: string): Promise<ScrapeResult> {
    const trimmed = input.trim();

    // 1. Tentar fazer parse se a entrada for uma string JSON
    if (trimmed.startsWith('{') || trimmed.includes('"series_item"') || trimmed.includes('"result"')) {
        try {
            const data = JSON.parse(trimmed);
            const seriesItem = data.result?.series_item || data.series_item || data.result || data;

            if (seriesItem && (seriesItem.title || seriesItem.nome)) {
                const title = seriesItem.title || seriesItem.nome;
                const description = seriesItem.description || seriesItem.descricao || null;
                const rawThumb = seriesItem.thumbnail || seriesItem.imagem_url || seriesItem.poster;
                
                return {
                    nome: title,
                    descricao: description,
                    imagem_url: formatKakaoImageUrl(rawThumb),
                    plataforma: 'kakao page',
                    nome_alternativo: seriesItem.authors || null
                };
            }
        } catch (e) {
            // Se falhar o JSON.parse, continua para a chamada via API/HTTP
        }
    }

    // 2. Extrair o ID da série a partir da URL
    const seriesIdMatch = trimmed.match(/(?:content\/|seriesId=|home\/)(\d+)/i) || trimmed.match(/\b\d{6,10}\b/);
    const seriesId = seriesIdMatch ? seriesIdMatch[1] || seriesIdMatch[0] : null;

    if (seriesId) {
        try {
            // Chamada à API BFF Gateway oficial do Kakao Page
            const bffUrl = `https://bff-page.kakao.com/api/gateway/api/v2/content/product/list?series_id=${seriesId}&cursor_index=0&cursor_direction=ANCHOR&window_size=1`;
            const response = await fetch(bffUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://page.kakao.com/'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const item = data.result?.series_item;

                if (item && item.title) {
                    const rawThumb = item.thumbnail;

                    return {
                        nome: item.title,
                        descricao: item.description || null,
                        imagem_url: formatKakaoImageUrl(rawThumb),
                        plataforma: 'kakao page',
                        nome_alternativo: item.authors || null
                    };
                }
            }
        } catch (e) {
            console.error("❌ Erro ao consultar Kakao BFF API:", e);
        }
    }

    // 3. Fallback via requisição HTML
    try {
        const { data: html } = await axios.get(trimmed, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        const $ = cheerio.load(html);

        const nextDataScript = $('#__NEXT_DATA__').html();
        if (nextDataScript) {
            try {
                const nextData = JSON.parse(nextDataScript);
                const pageProps = nextData.props?.pageProps;
                const initialState = pageProps?.initialState || pageProps?.dehydratedState;
                
                if (initialState) {
                    const seriesData = initialState.series || initialState.contentOverview || initialState.item;
                    if (seriesData?.title) {
                        return {
                            nome: seriesData.title,
                            descricao: seriesData.description || null,
                            imagem_url: seriesData.thumbnail || seriesData.image || null,
                            plataforma: 'kakao page',
                            nome_alternativo: seriesData.authors || null
                        };
                    }
                }
            } catch (e) {
                // ignora
            }
        }

        const rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
        const cleanTitle = rawTitle.replace(' | 카카오페이지', '').replace(' - 카카오페이지', '').split(' - ')[0].trim();
        const ogImage = $('meta[property="og:image"]').attr('content') || null;
        const ogDesc = $('meta[property="og:description"]').attr('content') || null;

        const nomeFinal = (cleanTitle === '카카오페이지' || !cleanTitle) ? (seriesId ? `Kakao Series #${seriesId}` : 'Kakao Webtoon') : cleanTitle;

        return {
            nome: nomeFinal,
            descricao: ogDesc,
            imagem_url: ogImage && !ogImage.includes('ogImage.png') ? ogImage : null,
            plataforma: 'kakao page'
        };
    } catch (err: any) {
        return {
            nome: seriesId ? `Kakao Series #${seriesId}` : 'Kakao Webtoon',
            descricao: null,
            imagem_url: null,
            plataforma: 'kakao page'
        };
    }
}