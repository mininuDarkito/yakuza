"use client"

import { cn } from "@/lib/utils"

export function TabelaGlobal() {
  const tabelas = [
    {
      titulo: "China (Comics)",
      corCabecalho: "bg-red-600",
      items: [
        { nome: "Kuaikan", preco: "$0.50" },
        { nome: "Bilibili", preco: "$0.60" },
        { nome: "ac.qq (Web)", preco: "$0.50" },
        { nome: "ac.qq (App)", preco: "$1.00", promo: "$0.80" },
        { nome: "iQiyi", preco: "$0.80" },
      ]
    },
    {
      titulo: "Coreia do Sul",
      corCabecalho: "bg-blue-600",
      items: [
        { nome: "KakaoPage", preco: "$0.50" },
        { nome: "KakaoPage +19", preco: "$0.75" },
        { nome: "Ridibooks", preco: "$0.50" },
        { nome: "Lezhin", preco: "$1.00" },
        { nome: "Naver", preco: "$2.50", status: "Hiatus" },
        { nome: "MrBlue", preco: "$0.40" },
      ]
    },
    {
      titulo: "Japão",
      corCabecalho: "bg-indigo-600",
      items: [
        { nome: "Piccoma / ComicFesta", preco: "$1.00" },
        { nome: "Ebook Japan", preco: "$1.20 - $1.50" },
        { nome: "Line Manga", preco: "$1.50 - $2.00" },
        { nome: "Mechacomic", preco: "$0.80 - $1.00" },
      ]
    },
    {
      titulo: "English / Global",
      corCabecalho: "bg-emerald-600",
      items: [
        { nome: "Webtoons App", preco: "$1.50" },
        { nome: "Manta / Tapas", preco: "variável / assinatura", isStatus: true },
      ]
    }
  ];

  return (
    /* AQUI ESTÁ O AJUSTE:
       No modo claro: bg-white e bordas cinza claro.
       No modo escuro (dark:): bg-zinc-900 e bordas pretas/transparentes.
    */
    <div className="w-full space-y-6 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-4 transition-all shadow-sm">
      {tabelas.map((tab, idx) => (
        <section key={idx} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900 shadow-sm transition-colors">
          
          <div className={cn("px-4 py-2 flex justify-between items-center", tab.corCabecalho)}>
            <h2 className="text-white font-black uppercase text-[10px] italic tracking-tight">{tab.titulo}</h2>
            <span className="text-[8px] text-white/50 font-bold uppercase italic tracking-widest text-right">Market Ref</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-black/20 border-b border-zinc-200 dark:border-white/5">
                  <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase italic">Plataforma</th>
                  <th className="px-4 py-2.5 text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase italic text-right">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                {tab.items.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-bold text-zinc-700 dark:text-zinc-200">{item.nome}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "font-mono font-bold text-[13px]",
                        item.isStatus ? "text-zinc-400 dark:text-zinc-500 italic uppercase text-[10px]" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {item.preco}
                      </span>
                      {item.promo && (
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 ml-2 italic font-black uppercase">
                           (${item.promo} promo)
                        </span>
                      )}
                      {item.status && (
                        <span className="text-[9px] text-red-500 font-black uppercase ml-2 italic">
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}