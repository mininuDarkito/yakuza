"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CheckCircle2,
  CircleDashed,
  Cloud,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  MessagesSquare,
  Network,
  Pencil,
  Save,
  Server,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  ENV_ONLY_VARIABLES,
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
  type SettingDefinition,
  type SettingGroup,
  type SettingKey,
  type SettingStatus,
} from "@/lib/settings-definitions"

const GROUP_ICONS: Record<SettingGroup, LucideIcon> = {
  discord: MessagesSquare,
  proxy: Network,
  cloudinary: Cloud,
  sistema: Server,
}

const GROUP_ORDER: SettingGroup[] = ["discord", "proxy", "cloudinary", "sistema"]

/** string = novo valor · null = remover valor salvo · ausente = sem alteração */
type Edits = Partial<Record<SettingKey, string | null>>

function toStatusMap(list: SettingStatus[]) {
  return Object.fromEntries(list.map((s) => [s.key, s])) as Record<SettingKey, SettingStatus>
}

export function SettingsForm({ initial }: { initial: SettingStatus[] }) {
  const router = useRouter()
  const [status, setStatus] = useState(() => toStatusMap(initial))
  const [edits, setEdits] = useState<Edits>({})
  const [revealed, setRevealed] = useState<Partial<Record<SettingKey, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  const pending = Object.keys(edits).length

  const definitionsByGroup = useMemo(() => {
    const map = {} as Record<SettingGroup, SettingDefinition[]>
    for (const group of GROUP_ORDER) {
      map[group] = SETTING_DEFINITIONS.filter((d) => d.group === group)
    }
    return map
  }, [])

  function setEdit(def: SettingDefinition, value: string | null) {
    setErrors((prev) => ({ ...prev, [def.key]: undefined }))
    setEdits((prev) => {
      const next = { ...prev }
      const unchanged =
        value !== null &&
        (def.secret ? value === "" : value === status[def.key].value)
      if (unchanged) delete next[def.key]
      else next[def.key] = value
      return next
    })
  }

  function discard() {
    setEdits({})
    setErrors({})
    setRevealed({})
  }

  async function save() {
    // Validação no navegador (o servidor valida de novo)
    const clientErrors: Record<string, string> = {}
    for (const def of SETTING_DEFINITIONS) {
      const value = edits[def.key]
      if (typeof value === "string" && value.trim() !== "") {
        const problem = def.validate?.(value.trim())
        if (problem) clientErrors[def.key] = problem
      }
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      toast.error("Corrija os campos destacados antes de salvar.")
      return
    }

    const changes: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(edits)) {
      changes[key] = value === null || value.trim() === "" ? null : value.trim()
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data?.fields) setErrors(data.fields)
        toast.error(data?.error || "Não foi possível salvar as configurações.")
        return
      }

      setStatus(toStatusMap(data.settings))
      setEdits({})
      setErrors({})
      setRevealed({})
      toast.success(`${pending} configuração(ões) salva(s) no banco.`)
      router.refresh()
    } catch {
      toast.error("Falha de rede ao salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-24">
      {GROUP_ORDER.map((group) => {
        const Icon = GROUP_ICONS[group]
        const info = SETTING_GROUPS[group]
        const defs = definitionsByGroup[group]
        const configured = defs.filter((d) => status[d.key].hasValue).length

        return (
          <section
            key={group}
            id={`config-${group}`}
            className="rounded-[2rem] border border-white/5 bg-zinc-950 p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <header className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none">
                    {info.title}
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-medium mt-1.5 max-w-xl leading-relaxed">
                    {info.description}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {configured}/{defs.length} configurados
              </span>
            </header>

            <div className="grid gap-5 md:grid-cols-2">
              {defs.map((def) => {
                const current = status[def.key]
                const edit = edits[def.key]
                const markedForRemoval = edit === null
                const isDirty = edit !== undefined
                const isRevealed = Boolean(revealed[def.key])
                const error = errors[def.key]

                const inputValue = def.secret
                  ? (typeof edit === "string" ? edit : "")
                  : (typeof edit === "string" ? edit : current.value)

                return (
                  <div key={def.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor={`setting-${def.key}`}
                        className="text-[11px] font-black uppercase tracking-wider text-zinc-300"
                      >
                        {def.label}
                        {def.secret && <Lock className="h-3 w-3 text-zinc-500" />}
                      </Label>
                      <FieldBadge
                        configured={current.hasValue}
                        dirty={isDirty}
                        removal={markedForRemoval}
                      />
                    </div>

                    {markedForRemoval ? (
                      <div className="flex h-9 items-center justify-between rounded-md border border-dashed border-red-500/40 bg-red-500/5 px-3 text-xs text-red-300">
                        <span>Será removido ao salvar</span>
                        <button
                          type="button"
                          onClick={() => setEdit(def, "")}
                          className="inline-flex items-center gap-1 font-bold uppercase text-[10px] text-zinc-300 hover:text-white"
                        >
                          <Undo2 className="h-3 w-3" /> Desfazer
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          id={`setting-${def.key}`}
                          name={def.key}
                          type={def.secret && !isRevealed ? "password" : "text"}
                          value={inputValue}
                          onChange={(e) => setEdit(def, e.target.value)}
                          placeholder={
                            def.secret && current.hasValue
                              ? `${current.preview}  (mantido)`
                              : def.placeholder
                          }
                          autoComplete={def.secret ? "new-password" : "off"}
                          spellCheck={false}
                          data-1p-ignore
                          aria-invalid={Boolean(error)}
                          className={cn(
                            "bg-black/40 border-white/10 font-mono text-xs",
                            def.secret && "pr-20",
                          )}
                        />
                        {def.secret && (
                          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealed((prev) => ({ ...prev, [def.key]: !prev[def.key] }))
                              }
                              className="rounded p-1.5 text-zinc-500 hover:text-white transition-colors"
                              title={isRevealed ? "Ocultar o que você digitou" : "Mostrar o que você digitou"}
                            >
                              {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            {current.hasValue && (
                              <button
                                type="button"
                                onClick={() => setEdit(def, null)}
                                className="rounded p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Remover valor salvo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <p
                      className={cn(
                        "text-[10px] leading-snug",
                        error ? "text-red-400 font-bold" : "text-zinc-500",
                      )}
                    >
                      {error || def.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* O QUE CONTINUA NO .ENV */}
      <section className="rounded-[2rem] border border-white/5 bg-zinc-950/60 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 text-zinc-300">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-black uppercase italic tracking-tighter">
            Continuam no arquivo .env
          </h2>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {ENV_ONLY_VARIABLES.map((v) => (
            <li key={v.name} className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-1.5">
              <code className="text-xs font-bold text-primary">{v.name}</code>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{v.description}</p>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Os segredos acima são salvos criptografados (AES-256-GCM) com uma chave derivada do{" "}
          <code className="text-zinc-300">NEXTAUTH_SECRET</code>. Se você trocar o{" "}
          <code className="text-zinc-300">NEXTAUTH_SECRET</code>, será preciso informar os segredos novamente.
        </p>
      </section>

      {/* BARRA DE SALVAR */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-4 pb-4 transition-all duration-300",
          pending > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-zinc-950/95 px-5 py-3 shadow-2xl backdrop-blur">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-300">
            <Pencil className="h-3.5 w-3.5 text-primary" />
            {pending} alteraç{pending === 1 ? "ão pendente" : "ões pendentes"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving} className="font-bold uppercase text-[10px]">
              Descartar
            </Button>
            <Button size="sm" onClick={save} disabled={saving} className="font-black uppercase italic text-[11px]">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldBadge({
  configured,
  dirty,
  removal,
}: {
  configured: boolean
  dirty: boolean
  removal: boolean
}) {
  if (removal) {
    return <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Remover</span>
  }
  if (dirty) {
    return <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Alterado</span>
  }
  return configured ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> Configurado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
      <CircleDashed className="h-3 w-3" /> Vazio
    </span>
  )
}
