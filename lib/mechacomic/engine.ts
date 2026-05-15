import { chromium } from 'playwright';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import { MechaConfigService } from './config-service';

export class CryptoProcessor {
  static decryptMechaComic(data: Buffer, keyHex: string): Buffer {
    try {
      if (!keyHex) return data;
      const key = Buffer.from(keyHex, 'hex');
      const iv = data.subarray(0, 16);
      const encrypted = data.subarray(16);
      
      // O tamanho da chave determina se é AES-128, AES-192 ou AES-256
      const algorithm = key.length === 32 ? 'aes-256-cbc' : (key.length === 24 ? 'aes-192-cbc' : 'aes-128-cbc');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);
      
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (e) {
      console.error('Erro na desencriptação MechaComic:', e);
      return data;
    }
  }
}

export async function getSeriesInfo(url: string) {
  const seriesInfo = {
    title: '',
    cover_url: '',
    points: '0',
    chapters: [] as any[]
  };

  const baseUrl = url.split('?')[0];
  let currentPage = 1;
  let hasNextPage = true;

  const browser = await chromium.launch({ headless: true });
  const contextOptions: any = { locale: 'ja-JP' };
  
  const storageState = await MechaConfigService.getConfig('playwright_session');
  if (storageState) {
    contextOptions.storageState = storageState;
  }
  
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    while (hasNextPage) {
      const pageUrl = `${baseUrl}?page=${currentPage}`;
      console.log(`Lendo página: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

      try {
        await page.waitForSelector('li.p-chapterList_item', { timeout: 10000 });
      } catch (e) {
        console.warn(`Capítulos não carregaram na página ${currentPage}. Fim da lista.`);
        break;
      }

      const html = await page.content();
      const $ = load(html);

      if (currentPage === 1) {
        const rawTitle = $('.p-bookInfo_title h1').text().trim() || 'Título Desconhecido';
        seriesInfo.title = rawTitle.replace(/\s*[【\(].*?[】\)]/g, '').trim();
        seriesInfo.cover_url = $('img.jacket_image_l').attr('src') || '';
        
        // Extrair pontos do cabeçalho
        const pointsValue = $('.colorRed.txt16').first().text().trim();
        if (pointsValue) {
          seriesInfo.points = pointsValue;
        }
      }

      const items = $('li.p-chapterList_item');
      if (items.length === 0) break;

      items.each((_, el) => {
        const item = $(el);
        const checkbox = item.find('input[name="chapter_ids[]"]');
        if (!checkbox.length) return;
        
        const chapterId = checkbox.val();
        const chNoText = item.find('.p-chapterList_no').text().replace(/\s+/g, ' ').trim().split(' ')[0] || '??';
        const chNameText = item.find('.p-chapterList_name').text().replace(/\s+/g, ' ').trim() || '??';
        
        const btnAreaText = item.find('.p-chapterList_btnArea').text().trim();
        let status = 'paid';
        let cost = '0';

        if (btnAreaText.includes('pt')) {
          cost = btnAreaText.replace(/\D/g, '');
          status = 'paid';
        } else if (btnAreaText.includes('無料') && !item.find('.c-icon-freeSerial').length) {
          status = 'free';
        } else if (btnAreaText.includes('読む')) {
          status = 'purchased';
        } else {
          status = 'wait_free';
        }

        seriesInfo.chapters.push({
          id: chapterId,
          number: chNoText,
          title: chNameText,
          status,
          cost
        });
      });

      const nextBtn = $('.pagination .next_page');
      if (nextBtn.length && !nextBtn.hasClass('disabled')) {
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }
  } finally {
    await browser.close();
  }

  return seriesInfo;
}

export async function buyAndAccessChapter(page: any, chapterId: string) {
  const chapterUrl = `https://mechacomic.jp/chapters/${chapterId}`;
  console.log(`Navegando para: ${chapterUrl}`);
  await page.goto(chapterUrl, { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  console.log(`URL atual após navegação: ${page.url()}`);
  
  if (page.url().includes('viewer/index.html')) {
    console.log("✅ Redirecionado direto para o leitor!");
    return true;
  }
  
  const readBtn = await page.$('input[type="submit"][value="読む"]');
  if (readBtn) {
    await readBtn.click();
    return true;
  }
  
  const readFreeBtn = await page.$('input[type="submit"][value="無料で読む"]');
  if (readFreeBtn) {
    await readFreeBtn.click();
    return true;
  }

  // Tratamento para conflito de múltiplas sessões
  const sessionConflictBtn = await page.$('input[type="submit"][value="はい"], button:has-text("はい"), button:has-text("他デバイスの閲覧を終了して読む")');
  if (sessionConflictBtn) {
    console.log("⚠️ Conflito de sessão detectado. Resolvendo...");
    await sessionConflictBtn.click();
    return true;
  }

  const freeChargeBtn = await page.$('button:has(img.c-icon-freeSerial)');
  if (freeChargeBtn) {
    await freeChargeBtn.click();
    return true;
  }

  const paidBtn = await page.$('button:has-text("ptで購入する"), input[type="submit"][value*="ptで購入する"]');
  if (paidBtn) {
    const isDisabled = await page.evaluate((el: HTMLButtonElement) => el.disabled, paidBtn);
    if (!isDisabled) {
      await paidBtn.click();
      return true;
    } else {
      console.warn("❌ Botão de comprar com pontos está desabilitado.");
    }
  }
  
  const genericRead = await page.$('a.c-btn-free, a.c-btn-buy, input.c-btn-read-end');
  if (genericRead) {
    await genericRead.click();
    return true;
  }
  
  console.warn("❌ Nenhum botão de ação válido foi encontrado na página.");
  return false;
}

export async function downloadAndProcessChapter(chapterId: string, seriesName: string, chapterTitle: string, stitch: boolean) {
  // O restante da lógica de download e stitch ficará em chamadas integradas, 
  // vou separar a responsabilidade.
  // Esta função gerenciará a sessão Playwright para capturar os JSONs e chaves.
  let cryptoKey: string | null = null;
  let jsonData: any = null;

  const browser = await chromium.launch({ headless: true });
  const contextOptions: any = { locale: 'ja-JP', ignoreHTTPSErrors: true };
  
  const storageState = await MechaConfigService.getConfig('playwright_session');
  if (storageState) {
    contextOptions.storageState = storageState;
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  page.on('response', async (response) => {
    const url = response.url();
    try {
      if (url.includes('/viewer_cryptokey/')) {
        cryptoKey = await response.text();
        console.log("🔑 Chave criptográfica interceptada!");
      } else if (url.includes('contents') && url.includes('.json')) {
        const data = await response.json();
        if (data.pages && data.images) {
          jsonData = data;
          jsonData.base_dir = url.substring(0, url.lastIndexOf('/') + 1);
          console.log("📄 JSON de imagens interceptado!");
        }
      }
    } catch (e) {}
  });

  try {
    const success = await buyAndAccessChapter(page, chapterId);
    if (!success) {
      return { error: "Falha na aquisição (Botão não encontrado ou sem pontos)." };
    }
    
    await page.waitForURL('**/viewer/index.html**', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    return { error: "O leitor não carregou a tempo." };
  } finally {
    await browser.close();
  }

  if (!jsonData || !cryptoKey) {
    return { error: "Dados criptografados não interceptados." };
  }

  return { jsonData, cryptoKey };
}

export async function loginAndSaveSession(email: string, pass: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ja-JP', ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    await page.goto('https://mechacomic.jp/session/input', { waitUntil: 'domcontentloaded' });
    
    // Tenta encontrar o campo de email/login
    const emailField = page.locator('input[type="email"], input[name="email"], input[name="login_id"]').first();
    if (await emailField.count() === 0) throw new Error("Campo de email não encontrado.");
    await emailField.fill(email);

    // Tenta encontrar o campo de senha
    const passField = page.locator('input[type="password"], input[name="password"]').first();
    if (await passField.count() === 0) throw new Error("Campo de senha não encontrado.");
    await passField.fill(pass);
    
    // Clica no botão de submit do form de login
    const submitBtn = page.locator('#login_form input[type="submit"], input[name="commit"][value="ログイン"]').first();
    if (await submitBtn.count() === 0) throw new Error("Botão de login não encontrado.");
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      submitBtn.click()
    ]);

    // Espera para ver se redirecionou
    await page.waitForTimeout(2000);
    const url = page.url();
    
    if (url.includes('session') || url.includes('login')) {
      // Se continuou na tela de login, tenta capturar a mensagem de erro
      const errorMsg = await page.locator('.c-alert, .error, .p-login_error, .c-text-error, .p-passwordContent p').innerText().catch(() => null);
      throw new Error(errorMsg || "Login falhou. Verifique as credenciais.");
    }

    // Salva a sessão no banco de dados
    const state = await context.storageState();
    await MechaConfigService.setConfig('playwright_session', state);
    return { success: true };
  } catch (e: any) {
    console.error('Erro no login automático do MechaComic:', e);
    return { error: e.message || "Erro desconhecido ao tentar fazer login." };
  } finally {
    await browser.close();
  }
}

// Função para buscar o saldo de pontos da conta MechaComic
export async function getAccountPoints() {
  const browser = await chromium.launch({ headless: true });
  const contextOptions: any = { locale: 'ja-JP' };
  
  const storageState = await MechaConfigService.getConfig('playwright_session');
  if (storageState) {
    contextOptions.storageState = storageState;
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    await page.goto('https://mechacomic.jp/', { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const $ = load(html);
    const pointsElement = $('.colorRed.txt16');
    if (pointsElement.length === 0) return null;
    
    const pointsValue = pointsElement.first().text().trim() || '0';
    return pointsValue;
  } finally {
    await browser.close();
  }
}

