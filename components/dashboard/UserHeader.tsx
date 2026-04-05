"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp, ShieldAlert, UserX } from "lucide-react"
import { cn } from "@/lib/utils"

// Definimos o que o componente espera receber de forma clara
interface UserHeaderProps {
    user: {
        discord_id: string;
        discord_avatar: string;
        discord_username: string;
        discord_banner?: string | null; // Hash do banner vindo do banco/auth
        role: string;
        gmv_total?: number;
        total_vendas?: number;
    };
    viewMode: 'admin' | 'user';
}

export function UserHeader({ user, viewMode }: UserHeaderProps) {
    // Monta a URL do banner do Discord se existir
    // Dentro do componente UserHeader, antes do return:

    const bannerUrl = (() => {
        // Se não houver banner, retorna null
        if (!user.discord_banner) return null;

        // Se por acaso o que vier no banco já for uma URL completa, usamos ela
        if (user.discord_banner.startsWith('http')) return user.discord_banner;

        // Caso contrário, montamos a URL padrão usando o ID e o Hash
        return `https://cdn.discordapp.com/banners/${user.discord_id}/${user.discord_banner}.png?size=1024`;
    })();

    return (
        <div
            className="flex flex-col md:flex-row items-center gap-8 p-10 rounded-[2rem] text-white shadow-2xl border-b-8 border-primary relative overflow-hidden transition-all duration-500"
            style={{
                // Camada de gradiente para garantir leitura do texto + Imagem
                backgroundImage: bannerUrl
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(9,9,11,1)), url(${bannerUrl})`
                    : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: !bannerUrl ? '#09090b' : 'transparent'
            }}
        >
            {/* Ícone de fundo decorativo (apenas se não houver banner) */}
            {!bannerUrl && (
                <div className="absolute -right-10 -bottom-10 opacity-5">
                    <TrendingUp className="h-64 w-64" />
                </div>
            )}

            {/* Avatar com borda neon suave */}
            <Avatar className="h-28 w-28 border-4 border-primary/30 shadow-2xl z-10">
                <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`} />
                <AvatarFallback className="text-3xl font-black bg-primary/20 text-primary uppercase">
                    {user.discord_username?.slice(0, 2)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left z-10">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter drop-shadow-lg">
                        {user.discord_username}
                    </h1>
                    <span className="bg-primary text-black font-black px-3 py-1 uppercase italic text-[10px] rounded-md h-fit shadow-lg">
                        {user.role}
                    </span>
                </div>

                {/* Bloco de métricas com efeito Glassmorphism */}
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                    <div className="bg-black/40 border border-white/10 p-3 rounded-2xl backdrop-blur-md min-w-[140px]">
                        <p className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-widest text-zinc-300">Faturamento Bruto</p>
                        <p className="text-xl font-black text-emerald-400 italic leading-none font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(user.gmv_total || 0)}
                        </p>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-3 rounded-2xl backdrop-blur-md text-center min-w-[100px]">
                        <p className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-widest text-zinc-300">Vendas Totais</p>
                        <p className="text-xl font-black text-white italic leading-none">{user.total_vendas || 0}</p>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas (Visíveis apenas para Admin) */}
            {viewMode === 'admin' && (
                <div className="z-10 flex flex-col gap-2 min-w-[180px]">
                    <Button variant="outline" size="sm" className="bg-black/20 backdrop-blur-sm border-white/10 text-[9px] font-black uppercase italic hover:bg-primary hover:text-black transition-all">
                        <ShieldAlert className="h-3 w-3 mr-2 text-primary group-hover:text-black" /> Alterar para Admin
                    </Button>
                    <Button variant="outline" size="sm" className="bg-black/20 backdrop-blur-sm border-white/10 text-[9px] font-black uppercase italic hover:bg-red-600 hover:text-white transition-all">
                        <UserX className="h-3 w-3 mr-2 text-red-500 group-hover:text-white" /> Banir Vendedor
                    </Button>
                </div>
            )}
        </div>
    )
}