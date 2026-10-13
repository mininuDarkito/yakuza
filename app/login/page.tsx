"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Lock, 
  Sparkles, 
  AlertCircle,
  Zap,
  CheckCircle2
} from "lucide-react";

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleDiscordLogin = () => {
    setIsLoading(true);
    signIn("discord", { callbackUrl });
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#09080e] text-white selection:bg-purple-500 selection:text-white"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09080e",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* GLOWS E GRADIENTES DE FUNDO */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none -z-10" 
        style={{ pointerEvents: "none" }}
      />
      <div 
        className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" 
        style={{ pointerEvents: "none" }}
      />
      <div 
        className="absolute top-10 left-10 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -z-10" 
        style={{ pointerEvents: "none" }}
      />

      {/* CARD PRINCIPAL DE LOGIN */}
      <div 
        className="w-full max-w-md rounded-3xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(124,58,237,0.12)] relative z-10 transition-all duration-300"
        style={{
          width: "100%",
          maxWidth: "440px",
          borderRadius: "1.5rem",
          backgroundColor: "rgba(10, 10, 14, 0.88)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 50px -10px rgba(124, 58, 237, 0.25)",
        }}
      >
        {/* HEADER DO CARD COM STATUS */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Terminal Ativo
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1 font-bold">
            <Lock className="w-3 h-3 text-zinc-500" /> Restrito
          </span>
        </div>

        {/* LOGO E IDENTIDADE VISUAL */}
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-purple-400" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center justify-center gap-2">
              Yakuza Raw
            </h1>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-1">
              Terminal do Ecossistema
            </p>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            Faça login com sua conta do Discord autorizada para gerenciar vendas, lançamentos e equipes.
          </p>
        </div>

        {/* ALERTA DE ERRO DE LOGIN SE HOUVER */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <p className="leading-snug">
              {error === "AccessDenied"
                ? "Acesso recusado: esta conta do Discord não possui permissão de acesso ao painel."
                : "Erro na autenticação. Por favor, tente novamente."}
            </p>
          </div>
        )}

        {/* BOTÃO PRINCIPAL DE LOGIN COM DISCORD */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleDiscordLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(88,101,242,0.4)] hover:shadow-[0_0_35px_rgba(88,101,242,0.6)] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "1rem",
              backgroundColor: "#5865F2",
              color: "#ffffff",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: "0.875rem",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 0 25px rgba(88, 101, 242, 0.4)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Conectando ao Discord...</span>
              </>
            ) : (
              <>
                <DiscordLogo className="w-5 h-5 shrink-0" />
                <span>Entrar com Discord</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 ml-auto opacity-70 group-hover:opacity-100" />
              </>
            )}
          </button>

          {/* ITENS INFORMATIVOS DE SEGURANÇA */}
          <div className="pt-4 border-t border-white/5 space-y-2 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sincronização automática com cargos e grupos</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Painel de auditoria, vendas e catálogo de obras</span>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO CARD */}
        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            © 2026 Yakuza Raw · Acesso Restrito
          </p>
        </div>
      </div>
    </div>
  );
}

// Ícone Oficial do Discord com dimensões fixas protegidas
function DiscordLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "22px",
        height: "22px",
        minWidth: "22px",
        minHeight: "22px",
        display: "block",
        flexShrink: 0,
      }}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09080e] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
