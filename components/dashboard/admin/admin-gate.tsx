"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { toast } from "sonner"

// Define quanto tempo o acesso dura (ex: 2 horas em milissegundos)
const SESSION_DURATION = 2 * 60 * 60 * 1000 

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 1. Efeito para verificar se existe uma sessão salva e válida ao carregar
  useEffect(() => {
    const savedAuth = localStorage.getItem("admin_session")
    
    if (savedAuth) {
      try {
        const { auth, timestamp } = JSON.parse(savedAuth)
        const now = Date.now()

        // Se estiver autorizado e o tempo não expirou
        if (auth === true && (now - timestamp < SESSION_DURATION)) {
          setIsAuthorized(true)
        } else {
          localStorage.removeItem("admin_session")
        }
      } catch (e) {
        localStorage.removeItem("admin_session")
      }
    }
    setIsLoading(false)
  }, [])

  const handleVerify = () => {
    if (password === "123456") {
      const authState = {
        auth: true,
        timestamp: Date.now()
      }
      
      // 2. Salva no localStorage para persistir o timer
      localStorage.setItem("admin_session", JSON.stringify(authState))
      
      setIsAuthorized(true)
      toast.success("Acesso administrativo liberado")
    } else {
      toast.error("Senha incorreta!")
    }
  }

  // Função para deslogar manualmente (opcional)
  const handleLogout = () => {
    localStorage.removeItem("admin_session")
    setIsAuthorized(false)
    setPassword("")
    toast.info("Sessão admin encerrada")
  }

  // Evita flash de conteúdo ou tela de login enquanto verifica o localStorage
  if (isLoading) return null

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
        <div className="bg-primary/10 p-6 rounded-full animate-pulse">
          <Lock className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Área de Segurança</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Esta seção exige autenticação de nível 3. Digite a senha mestra para continuar.
          </p>
        </div>
        <div className="flex w-full max-w-sm gap-2">
          <Input 
            type="password" 
            placeholder="Senha de Acesso" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          <Button onClick={handleVerify} className="font-bold">Acessar</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Botão flutuante para encerrar sessão se necessário */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-[10px] uppercase font-bold opacity-30 hover:opacity-100 transition-opacity"
        >
          Trancar Área Admin
        </Button>
      </div>
      {children}
    </>
  )
}