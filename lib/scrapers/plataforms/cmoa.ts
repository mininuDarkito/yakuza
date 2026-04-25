import axios from "axios";
import * as cheerio from "cheerio";

// Adicione esta interface para o TypeScript entender o retorno
interface ScrapeResult {
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  plataforma: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ja-JP" },
  });
  const $ = cheerio.load(html);
  const titulo = $('meta[property="og:title"]').attr("content") || "";

  // Limpeza do título: mantém o [タテヨミ] e remove o resto (capítulo, etc)
  // Exemplo: 欠陥聖女ですが絶倫公爵にすがられています【タテヨミ】1話｜...
  // Retorna: 欠陥聖女ですが絶倫公爵にすがられています【タテヨミ】

  let tituloLimpo = titulo.split(/[|｜]/)[0].trim();
  // Remover número de capítulo/volume no final (ex: 1話, 1巻, 10話)
  tituloLimpo = tituloLimpo.replace(/\s?\d+[話巻]$/, "").trim();
  // limpar descricao        コミックシーモアなら無料で試し読み！欠陥聖女ですが絶倫公爵にすがられています【タテヨミ】 1巻｜「頼む…俺を、この淫らな夢から救ってくれ…！」病を治せず、“欠陥品”と蔑まれる聖女・ユリア。北部の支配者“氷の公爵”の城へ送られた彼女が見たのは、発情して苦しむ公爵の姿だった。彼に触れた瞬間、ユリアの脳裏に淫らな光景が流れ込む。そして夢と現実の狭間で、公爵は彼女に救いを求めて…。美しく冷酷な公爵が、欠陥聖女にすがりつく──立場逆転すがられロマンス。【クレジット】脚本:森本イチカ・Plott / ネーム:円谷まる / 線画:アサ山 / 背景・着彩・仕上げ:PaWa / プロデュース・ディレクション：堀江理沙 / 原作・制作:Plott">
  // retorna 「頼む…俺を、この淫らな夢から救ってくれ…！」病を治せず、“欠陥品”と蔑まれる聖女・ユリア。北部の支配者“氷の公爵”の城へ送られた彼女が見たのは、発情して苦しむ公爵の姿だった。彼に触れた瞬間、ユリアの脳裏に淫らな光景が流れ込む。そして夢と現実の狭間で、公爵は彼女に救いを求めて…。美しく冷酷な公爵が、欠陥聖女にすがりつく──立場逆転すがられロマンス。

  const descricao =
    $('meta[property="og:description"]').attr("content")?.trim() || "";
  const partesDescricao = descricao.split(/[|｜]/);
  let descricaoLimpa =
    partesDescricao.length > 1
      ? partesDescricao[1].trim()
      : partesDescricao[0].trim();

  // Remover créditos se existirem
  if (descricaoLimpa.includes("【クレジット】")) {
    descricaoLimpa = descricaoLimpa.split("【クレジット】")[0].trim();
  }

  return {
    nome: tituloLimpo.trim(),
    descricao: descricaoLimpa,
    imagem_url: $('meta[property="og:image"]').attr("content")?.trim() || null,
    plataforma: "CMOA",
  };
}
