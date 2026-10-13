import { UserHeader } from "@/components/dashboard/UserHeader"
import { PerformanceCycle } from "@/components/dashboard/PerformanceCycle"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { PaymentGateway } from "@/components/dashboard/PaymentGateway"

export const dynamic = "force-dynamic";

export default async function UserDetailsPage(props: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ page?: string }>
}) {
  const params = await props.params;
  const userId = params.id;

  // 1. BUSCA DADOS VIA API 
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie");

  const res = await fetch(`${baseUrl}/api/admin/user/${userId}`, {
    headers: {
      "cookie": cookie || "", // Repassa apenas a sessão
    },
    next: { revalidate: 0 }
  });
  if (!res.ok) {
    console.error("Erro na busca da API:", res.status);
    return notFound();
  }

  const data = await res.json();
  const { user } = data;

  return (
    <AdminGate>
      <UserHeader user={user} viewMode="admin" />

      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <Link href="/dashboard/admin" className="group text-[10px] font-black flex items-center gap-2 hover:text-primary transition-colors uppercase italic tracking-widest text-zinc-500">
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Painel Yakuza
        </Link>

        <PerformanceCycle userId={userId} viewMode="admin" />

        <PaymentGateway
          userId={userId}
          initialData={user.billing_setup}
          viewMode="admin"
        />
      </div>
    </AdminGate>
  )
}