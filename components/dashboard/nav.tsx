"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Download,
  LogOut,
  Menu,
  ShieldCheck,
  Settings,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { ModeToggle } from "./mode-toggle" // Ajuste o caminho conforme necessário

interface NavProps {
  user: {
    id: string
    discordId: string
    discordUsername: string
    discordAvatar: string | null
    role: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function DashboardNav({ user }: NavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/grupos", label: "Grupos", icon: FolderOpen },
    { href: "/dashboard/produtos", label: "Produtos", icon: Package },
    { href: "/dashboard/vendas", label: "Vendas", icon: ShoppingCart },
    { href: "/dashboard/exportar", label: "Exportar", icon: Download },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ]

  if (user.role === 'admin') {
    navItems.push({ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck })
  }

  const avatarUrl = user.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`
    : undefined

  if (!mounted) {
    return <header className="h-14 border-b bg-background/95 backdrop-blur" />
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* DESKTOP NAV */}
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="font-black uppercase italic tracking-tighter">Yakuza Raws</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black uppercase italic transition-all hover:bg-accent",
                  pathname === item.href
                    ? "bg-accent text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", pathname === item.href && "text-primary")} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* MOBILE NAV (SHEET) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-background">
            <div className="flex flex-col gap-6 py-4">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <ShoppingCart className="h-6 w-6 text-primary" />
                <span className="font-black uppercase italic tracking-tighter">Nexus</span>
              </Link>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-black uppercase italic transition-all",
                      pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between md:justify-end gap-2 md:gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="font-black uppercase italic tracking-tighter">Nexus</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* BOTÃO DE TEMA */}
            <ModeToggle />

            {/* USER MENU */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarUrl} alt={user.discordUsername} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.discordUsername.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black uppercase italic leading-none">{user.discordUsername}</p>
                    <p className="text-[10px] text-muted-foreground truncate italic font-bold uppercase">{user.role}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild className="cursor-pointer font-black uppercase italic text-[10px] text-primary focus:bg-primary/5">
                    <Link href="/dashboard/admin">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Painel de Admin
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5 font-black uppercase italic text-[10px]"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}