import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function explodeCapitulos(input: string): number[] {
    const limpo = input.replace(/\s+/g, '');
    if (limpo.includes('-')) {
        const partes = limpo.split('-');
        const inicio = parseInt(partes[0].replace(/\D/g, ''));
        const fim = parseInt(partes[1].replace(/\D/g, ''));
        if (!isNaN(inicio) && !isNaN(fim)) {
            const min = Math.min(inicio, fim);
            const max = Math.max(inicio, fim);
            return Array.from({ length: max - min + 1 }, (_, i) => min + i);
        }
    }
    if (limpo.includes(',')) {
        return limpo.split(',')
            .map(n => parseInt(n.replace(/\D/g, '')))
            .filter(n => !isNaN(n));
    }
    const unico = parseInt(limpo.replace(/\D/g, ''));
    return isNaN(unico) ? [] : [unico];
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: "403" }, { status: 403 });

    try {
        const data = await request.json();
        const { user_id, produto_id, valor, capitulosString, data: dataVenda, grupo_id } = data;

        const listaCapitulos = explodeCapitulos(capitulosString);
        
        if (listaCapitulos.length === 0) {
            return NextResponse.json({ error: "Nenhum capítulo identificado" }, { status: 400 });
        }

        // Padronizamos a data para evitar o erro de fuso horário que vimos antes
        const dataFormatada = `${dataVenda}T00:00:00.000Z`;

        // INICIAMOS UMA TRANSAÇÃO
        await sql.query('BEGIN');

        try {
            for (const cap of listaCapitulos) {
                await sql.query(`
                    INSERT INTO vendas (
                        user_id, 
                        produto_id, 
                        grupo_id,
                        quantidade,      
                        preco_unitario, 
                        preco_total,     
                        data_venda, 
                        observacoes,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                `, [
                    user_id, 
                    produto_id, 
                    grupo_id || null,
                    cap,               
                    valor,             
                    valor,             
                    dataFormatada,
                    `Lote: ${capitulosString}`
                ]);
            }

            await sql.query('COMMIT');
            return NextResponse.json({ success: true, totalInserido: listaCapitulos.length });

        } catch (innerError: any) {
            await sql.query('ROLLBACK'); // Desfaz tudo se um falhar
            throw innerError;
        }

    } catch (error: any) {
        console.error("❌ Erro no registro mestre:", error.message);
        
        if (error.message.includes('unique_venda_capitulo') || error.code === '23505') {
            return NextResponse.json({ 
                error: "Conflito: Um ou mais capítulos desse lote já existem para esse usuário/grupo." 
            }, { status: 400 });
        }

        return NextResponse.json({ error: "Erro interno ao registrar lote" }, { status: 500 });
    }
}