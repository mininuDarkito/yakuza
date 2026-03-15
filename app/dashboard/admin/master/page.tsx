import { sql } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notFound } from "next/navigation"
import { MasterControl } from "./master-control" // ajuste o caminho se necessário
import { Settings2 } from "lucide-react"

export default async function MasterPage() {
    const session = await getServerSession(authOptions)
    
    // Segurança: Apenas admins acessam
    if (session?.user?.role !== 'admin') {
        return notFound()
    }

    // Busca usuários para o Select do componente
    const usersRes = await sql.query(`
        SELECT id, discord_username 
        FROM users 
        ORDER BY discord_username ASC
    `)

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header da Página */}
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl">
                    <Settings2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                        Controle Mestre
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Injeção de vendas em massa e cadastro automático de séries.
                    </p>
                </div>
            </div>

            {/* O Componente que você criou */}
            <MasterControl usuarios={usersRes.rows} />
        </div>
    )
}