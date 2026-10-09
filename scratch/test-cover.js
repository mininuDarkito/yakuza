const axios = require('axios');
const cheerio = require('cheerio');

async function testCoverExtraction() {
  const res = await axios.get('https://mechacomic.jp/books/140961', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  const $ = cheerio.load(res.data);

  let coverUrl = $('meta[name="twitter:image"]').attr('content') || '';
  if (!coverUrl || coverUrl.includes('re-ogp_logo') || coverUrl.includes('img_not_available')) {
    coverUrl = $('meta[property="og:image"]').attr('content') || '';
  }
  if (!coverUrl || coverUrl.includes('re-ogp_logo') || coverUrl.includes('img_not_available')) {
    coverUrl = $('img.jacket_image_l').attr('src') || $('img.jacket_image_l').attr('data-src') || '';
  }
  if (!coverUrl || coverUrl.includes('img_not_available') || coverUrl.includes('re-ogp_logo')) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.includes('/images/book/') && !src.includes('common')) {
        coverUrl = src;
      }
    });
  }

  if (coverUrl.startsWith('//')) {
    coverUrl = `https:${coverUrl}`;
  }

  console.log('Extracted cover URL:', coverUrl);
}

testCoverExtraction();
