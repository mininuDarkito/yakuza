import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        // 1. Bloqueio de Segurança: Apenas Admin pode selar meses
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, mes, ano, level } = body;

        if (!userId || !mes || !ano || !level) {
            return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
        }

        let query = "";
        
        // 2. Lógica de Níveis de Tranca
        if (level === 1) {
            // Nível 1: Tranca apenas para o Usuário (Vendedor)
            query = `
                UPDATE vendas 
                SET lock_user = true 
                WHERE user_id = $1 
                AND EXTRACT(MONTH FROM data_venda AT TIME ZONE 'UTC') = $2 
                AND EXTRACT(YEAR FROM data_venda AT TIME ZONE 'UTC') = $3
            `;
        } else if (level === 2) {
            // Nível 2: Tranca Master (Sela para Admin também)
            // Geralmente, selar master também implica em trancar o usuário
            query = `
                UPDATE vendas 
                SET lock_admin = true, lock_user = true 
                WHERE user_id = $1 
                AND EXTRACT(MONTH FROM data_venda AT TIME ZONE 'UTC') = $2 
                AND EXTRACT(YEAR FROM data_venda AT TIME ZONE 'UTC') = $3
            `;
        }

        const result = await sql.query(query, [userId, mes, ano]);

        // 3. Log de Auditoria para o "Cofre"
        await sql.query(`
            INSERT INTO activity_logs (user_id, action, entity_type, details)
            VALUES ($1, $2, 'financeiro', $3)
        `, [
            session.user.id, 
            level === 1 ? 'user_lock_applied' : 'master_lock_applied',
            JSON.stringify({ 
                target_user: userId, 
                periodo: `${mes}/${ano}`,
                afetados: result.rowCount 
            })
        ]);

        return NextResponse.json({ 
            success: true, 
            message: `${result.rowCount} registros foram trancados.` 
        });

    } catch (error: any) {
        console.error("❌ Erro no Mass Lock:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}