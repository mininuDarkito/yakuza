import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardNav } from "@/components/dashboard/nav"
import Particles from "@/components/Particles"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/logar")
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <Particles
          particleColors={["#ffffff", "#6366f1", "#a855f7"]}
          particleCount={250}
          particleSpread={12}
          speed={0.15}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <DashboardNav user={session.user} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
