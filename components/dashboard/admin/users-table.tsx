"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Eye, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link" // Importação necessária para a navegação

interface UserAdmin {
  id: string
  discord_username: string
  discord_avatar: string | null
  discord_id: string
  role: string
  total_vendas: number
  faturamento_total: number
}

export function UsersTable({ users }: { users: UserAdmin[] }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-bold uppercase text-[10px] tracking-widest">Vendedor</TableHead>
            <TableHead className="font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
            <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest">Caps.</TableHead>
            <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest">Volume (GMV)</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors group">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-transform group-hover:scale-110">
                    <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`} />
                    <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                      {user.discord_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight">{user.discord_username}</span>
                    <span className="text-[9px] text-muted-foreground font-mono opacity-60">ID: {user.discord_id}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase italic px-2">
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-xs font-bold bg-muted px-2 py-1 rounded">
                  {user.total_vendas}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(user.faturamento_total)}
                  </span>
                  {user.faturamento_total > 0 && (
                    <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                      <TrendingUp className="h-2 w-2" /> ATIVO
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {/* AQUI ESTÁ A MUDANÇA: O LINK PARA O DOSSIÊ */}
                <Link href={`/dashboard/admin/usuarios/${user.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Ver Dossiê</span>
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}