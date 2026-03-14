import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Verifique se este é o caminho correto do seu authOptions
import { resolveMetadata } from "@/lib/scrapers"; // Usando o nosso centralizador inteligente

export async function POST(request: Request) {
  // CORREÇÃO: Passando authOptions para validar a sessão de Admin
  const session = await getServerSession(authOptions); 
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { links } = await request.json();
    
    // Limpeza de links (remove espaços, quebras de linha e duplicatas)
    const listaLinks = [...new Set(
      (links as string)
        .split(/[\s,\n,]+/)
        .filter((l) => l.startsWith('http'))
    )];
    
    const resultados = { sucessos: 0, falhas: 0, obras: [] as string[] };

    for (const url of listaLinks) {
      try {
        // Usamos o resolver que centraliza a lógica de IF/ELSE das plataformas
        const metadata = await resolveMetadata(url);

        if (!metadata?.nome) {
          resultados.falhas++;
          continue;
        }

        // SQL PURO: UPSERT (Insere ou Atualiza)
        await sql.query(`
          INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (nome) 
          DO UPDATE SET 
            descricao = EXCLUDED.descricao,
            imagem_url = COALESCE(EXCLUDED.imagem_url, produtos.imagem_url),
            link_serie = EXCLUDED.link_serie,
            plataforma = EXCLUDED.plataforma,
            updated_at = NOW()
        `, [
          metadata.nome, 
          metadata.descricao, 
          metadata.imagem_url, 
          url, 
          metadata.plataforma || 'auto'
        ]);

        resultados.sucessos++;
        resultados.obras.push(metadata.nome);
      } catch (err) {
        console.error(`❌ Erro ao processar link: ${url}`, err);
        resultados.falhas++;
      }
    }

    return NextResponse.json(resultados);
  } catch (error) {
    console.error("❌ Erro crítico no Bulk Server:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}