"use client"

export function TabelaGlobal() {
    return (
        <>

            <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                <div className="grid gap-8">

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-red-500 px-6 py-3">
                            <h2 className="text-white font-bold tracking-wide uppercase text-sm">China (Comics)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-bottom border-slate-200">
                                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Plataforma</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Preço</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Kuaikan</td><td className="px-6 py-4 text-green-600 font-bold">$0.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Bilibili</td><td className="px-6 py-4 text-green-600 font-bold">$0.60</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">ac.qq (Web)</td><td className="px-6 py-4 text-green-600 font-bold">$0.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">ac.qq (App)</td><td className="px-6 py-4"><span className="text-green-600 font-bold">$1.00</span> <span className="text-xs text-slate-400">($0.80 promo)</span></td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">iQiyi</td><td className="px-6 py-4 text-green-600 font-bold">$0.80</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-blue-600 px-6 py-3">
                            <h2 className="text-white font-bold tracking-wide uppercase text-sm">Coreia do Sul</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">KakaoPage</td><td className="px-6 py-4 text-green-600 font-bold">$0.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">KakaoPage +19</td><td className="px-6 py-4 text-green-600 font-bold">$0.75</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Ridibooks</td><td className="px-6 py-4 text-green-600 font-bold">$0.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Lezhin</td><td className="px-6 py-4 text-green-600 font-bold">$1.00</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Naver</td><td className="px-6 py-4"><span className="text-green-600 font-bold">$2.50</span> <span className="text-xs text-red-400 font-normal ml-2">Hiatus</span></td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">MrBlue</td><td className="px-6 py-4 text-green-600 font-bold">$0.40</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary italic text-slate-400">Bomtoon</td><td className="px-6 py-4 text-slate-400 italic">Coming soon</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-indigo-600 px-6 py-3">
                            <h2 className="text-white font-bold tracking-wide uppercase text-sm">Japão</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Piccoma / ComicFesta</td><td className="px-6 py-4 text-green-600 font-bold">$1.00</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Ebook Japan</td><td className="px-6 py-4 text-green-600 font-bold">$1.20 - $1.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Line Manga</td><td className="px-6 py-4 text-green-600 font-bold">$1.50 - $2.00</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Mechacomic / Jumptoon</td><td className="px-6 py-4 text-green-600 font-bold">$0.80 - $1.00</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary">Comico JP</td><td className="px-6 py-4 text-green-600 font-bold">$0.90</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-emerald-600 px-6 py-3">
                            <h2 className="text-white font-bold tracking-wide uppercase text-sm">English / Global</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary text-slate-700">Webtoons App</td><td className="px-6 py-4 text-green-600 font-bold">$1.50</td></tr>
                                    <tr className="hover:bg-slate-50 transition"><td className="px-6 py-4 font-medium text-primary text-slate-700">Manta / Tapas / Webnovel</td><td className="px-6 py-4 text-slate-400 italic">Preço Variável / Assinatura</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>

                <footer className="mt-10 text-center text-slate-400 text-sm italic">
                    * Valores sujeitos a alterações dependendo da série ou promoções temporárias.
                </footer>
            </div>




        </>


    )

}