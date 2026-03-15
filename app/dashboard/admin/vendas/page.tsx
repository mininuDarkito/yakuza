import { sql } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notFound } from "next/navigation"
import { EditVendasAdmin } from "@/components/dashboard/admin/EditVendasAdmin"
import { Settings2 } from "lucide-react"

export default async function EditVendasPage() {
    const session = await getServerSession(authOptions)
    
    // Bloqueio de segurança
    if (session?.user?.role !== 'admin') {
        return notFound()
    }

    // Busca apenas o básico dos usuários para o Select do editor
    const usersRes = await sql.query(`
        SELECT id, discord_username 
        FROM users 
        ORDER BY discord_username ASC
    `)

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl">
                    <Settings2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                        Ajuste de Registros
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Corrija valores, quantidades ou datas de vendas de qualquer usuário.
                    </p>
                </div>
            </div>

            {/* Importação do Componente */}
            <EditVendasAdmin usuarios={usersRes.rows} />
        </div>
    )
}