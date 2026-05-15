import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveMetadata } from "@/lib/scrapers";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions); 
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const { links } = await request.json();
    
    const listaLinks = [...new Set(
      (links as string)
        .split(/[\s,\n,]+/)
        .filter((l) => l.startsWith('http'))
    )];
    
    const resultados = { sucessos: 0, falhas: 0, obras: [] as string[] };

    // Processamento em série para evitar sobrecarga (ou paralelo controlado)
    for (const url of listaLinks) {
      try {
        const metadata = await resolveMetadata(url);

        if (!metadata?.nome) {
          resultados.falhas++;
          continue;
        }

        await prisma.produtos.upsert({
            where: { nome: metadata.nome },
            update: {
                descricao: metadata.descricao || undefined,
                imagem_url: metadata.imagem_url || undefined,
                link_serie: url,
                plataforma: metadata.plataforma || 'auto',
                updated_at: new Date()
            },
            create: {
                nome: metadata.nome,
                descricao: metadata.descricao || "",
                imagem_url: metadata.imagem_url || "",
                link_serie: url,
                plataforma: metadata.plataforma || 'auto'
            }
        });

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