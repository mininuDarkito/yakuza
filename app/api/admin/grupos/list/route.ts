import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * API: Listagem de Grupos Yakuza Raws
 * Filtra grupos baseados em vínculos (UserSeries) ou hierarquia administrativa.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // 1. Verificação de Autenticação
        if (!session || !session.user) {
            return NextResponse.json({ error: "Sessão expirada ou não autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Normalização do ID (Trata strings 'null' ou 'undefined' vindas do front-end)
        const targetId = (userId === "undefined" || userId === "null" || !userId) ? null : userId;
        
        const isAdmin = session.user?.role === 'admin';
        const isOwner = session.user?.id === targetId;

        // 2. Regras de Segurança Yakuza
        // Se um usuário comum tenta passar o ID de outra pessoa na URL, bloqueamos.
        if (!isAdmin && targetId && !isOwner) {
            return NextResponse.json({ error: "Acesso negado: Você não pode listar grupos de outro membro." }, { status: 403 });
        }

        let query = "";
        let values: any[] = [];

        // 3. Lógica de Consulta Híbrida
        if (targetId) {
            /** * LISTAGEM POR VÍNCULO (Para Vendedores/Staff)
             * Busca apenas grupos onde o usuário tem obras vinculadas ativas.
             * Isso evita que o formulário de venda mostre grupos onde ele não trabalha.
             */
            query = `
                SELECT DISTINCT 
                    g.id, 
                    g.nome, 
                    g.channel_id,
                    g.user_id as owner_id
                FROM grupos g
                INNER JOIN user_series us ON us.grupo_id = g.id
                WHERE us.user_id = $1 AND us.ativo = true
                ORDER BY g.nome ASC
            `;
            values = [targetId];
        } else {
            /** * LISTAGEM GLOBAL (Apenas para Admins)
             * Permite ver todos os canais registrados na Yakuza Raws para gestão.
             */
            if (!isAdmin) {
                return NextResponse.json({ error: "Apenas administradores podem ver a listagem global." }, { status: 403 });
            }

            query = `
                SELECT id, nome, channel_id, user_id as owner_id 
                FROM grupos 
                ORDER BY nome ASC
            `;
        }

        const res = await sql.query(query, values);

        // 4. Retorno formatado
        return NextResponse.json(res.rows);

    } catch (error: any) {
        console.error("❌ [YAKUZA API ERROR]:", error.message);
        return NextResponse.json(
            { error: "Falha interna ao processar lista de grupos." }, 
            { status: 500 }
        );
    }
}