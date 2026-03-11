"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  const handleVerify = () => {
    // A senha idealmente viria de uma variável de ambiente (process.env.ADMIN_PASS)
    if (password === "123456") { // Troque pela sua senha mestra
      setIsAuthorized(true)
      toast.success("Acesso administrativo liberado")
    } else {
      toast.error("Senha incorreta!")
    }
  }

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

  return <>{children}</>
}