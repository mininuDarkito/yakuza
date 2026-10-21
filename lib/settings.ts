/**
 * Configurações do sistema armazenadas no banco (tabela `app_settings`).
 *
 * Substitui as variáveis de ambiente (Discord, proxy, Cloudinary, cron, TZ).
 * Apenas DATABASE_URL, NEXTAUTH_SECRET e NEXTAUTH_URL continuam no .env.
 *
 * - Valores marcados como `secret` são criptografados (AES-256-GCM) com uma chave
 *   derivada do NEXTAUTH_SECRET. Se o NEXTAUTH_SECRET mudar, os segredos antigos
 *   ficam ilegíveis e precisam ser digitados de novo no painel.
 * - A tabela é criada automaticamente no primeiro acesso. Nessa primeira vez (e
 *   somente nela) os valores que ainda existirem no ambiente são importados para o
 *   banco, para que a migração do .env não derrube o sistema.
 * - As leituras usam um cache curto em memória (compartilhado via globalThis).
 */
import crypto from 'crypto'
import { sql } from './db'
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  type SettingKey,
  type SettingStatus,
} from './settings-definitions'

export { SETTING_DEFINITIONS, SETTING_KEYS }
export type { SettingKey, SettingStatus }

const CACHE_TTL_MS = 15_000
const ENC_PREFIX = 'enc:v1:'

type Snapshot = { values: Map<SettingKey, string>; loadedAt: number }

const g = globalThis as unknown as {
  __appSettingsSnapshot?: Snapshot
  __appSettingsInflight?: Promise<Snapshot>
  __appSettingsReady?: Promise<void>
}

const isSettingKey = (key: string): key is SettingKey =>
  (SETTING_KEYS as readonly string[]).includes(key)

/* ------------------------------------------------------------------ */
/* Criptografia                                                        */
/* ------------------------------------------------------------------ */

function encryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET ausente: necessário para proteger as configurações.')
  }
  return Buffer.from(
    crypto.hkdfSync('sha256', secret, 'yakuza-app-settings', 'app_settings:v1', 32),
  )
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ENC_PREFIX + Buffer.concat([iv, tag, data]).toString('base64')
}

function decrypt(stored: string): string | undefined {
  if (!stored.startsWith(ENC_PREFIX)) return stored
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64')
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      raw.subarray(0, 12),
    )
    decipher.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    console.error(
      '[settings] Não foi possível descriptografar uma configuração (o NEXTAUTH_SECRET mudou?). Informe o valor novamente no painel.',
    )
    return undefined
  }
}

function maskSecret(value: string): string {
  return value.length >= 12 ? `••••••••${value.slice(-4)}` : '••••••••'
}

/* ------------------------------------------------------------------ */
/* Tabela e importação inicial                                         */
/* ------------------------------------------------------------------ */

async function importFromEnv(): Promise<void> {
  const keys: string[] = []
  const values: string[] = []
  const secrets: boolean[] = []

  for (const def of SETTING_DEFINITIONS) {
    const names = [def.key, ...(def.legacyEnv ?? [])]
    const found = names.map((n) => process.env[n]).find((v) => v && v.trim() !== '')
    if (!found) continue
    const value = found.trim()
    keys.push(def.key)
    values.push(def.secret ? encrypt(value) : value)
    secrets.push(def.secret)
  }

  if (keys.length === 0) return

  await sql.query(
    `INSERT INTO app_settings (key, value, is_secret)
     SELECT k, v, s FROM unnest($1::text[], $2::text[], $3::boolean[]) AS t(k, v, s)
     ON CONFLICT (key) DO NOTHING`,
    [keys, values, secrets],
  )
  console.log(
    `[settings] ${keys.length} configuração(ões) importada(s) do ambiente para o banco: ${keys.join(', ')}`,
  )
}

function ensureTable(): Promise<void> {
  if (!g.__appSettingsReady) {
    g.__appSettingsReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key        TEXT PRIMARY KEY,
          value      TEXT NOT NULL,
          is_secret  BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      const { rows } = await sql.query('SELECT COUNT(*)::int AS total FROM app_settings')
      if (rows[0]?.total === 0) await importFromEnv()
    })().catch((error) => {
      g.__appSettingsReady = undefined
      throw error
    })
  }
  return g.__appSettingsReady
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

async function loadSnapshot(): Promise<Snapshot> {
  await ensureTable()
  const { rows } = await sql.query('SELECT key, value FROM app_settings')
  const values = new Map<SettingKey, string>()
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue
    const plain = decrypt(row.value)
    if (plain) values.set(row.key, plain)
  }
  const snapshot = { values, loadedAt: Date.now() }
  g.__appSettingsSnapshot = snapshot
  return snapshot
}

async function getSnapshot(force = false): Promise<Snapshot> {
  const cached = g.__appSettingsSnapshot
  if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached

  if (!g.__appSettingsInflight) {
    g.__appSettingsInflight = loadSnapshot().finally(() => {
      g.__appSettingsInflight = undefined
    })
  }

  try {
    return await g.__appSettingsInflight
  } catch (error) {
    // Oscilação do banco: continua com o último valor conhecido.
    if (cached) return cached
    throw error
  }
}

export function invalidateSettingsCache(): void {
  g.__appSettingsSnapshot = undefined
}

/** Lê uma configuração. Retorna `undefined` se não estiver definida (ou se o banco falhar). */
export async function getSetting(key: SettingKey): Promise<string | undefined> {
  try {
    return (await getSnapshot()).values.get(key)
  } catch (error) {
    console.error(`[settings] Não foi possível ler "${key}":`, error)
    return undefined
  }
}

export async function getSettings<K extends SettingKey>(
  keys: readonly K[],
): Promise<Record<K, string | undefined>> {
  const result = {} as Record<K, string | undefined>
  try {
    const { values } = await getSnapshot()
    for (const key of keys) result[key] = values.get(key)
  } catch (error) {
    console.error('[settings] Não foi possível ler as configurações:', error)
    for (const key of keys) result[key] = undefined
  }
  return result
}

/** Configuração do proxy dos scrapers (strings vazias quando não definido). */
export async function getProxyConfig() {
  const s = await getSettings(['PROXY_USER', 'PROXY_PASS', 'PROXY_HOST', 'PROXY_PORT'] as const)
  return {
    PROXY_USER: s.PROXY_USER ?? '',
    PROXY_PASS: s.PROXY_PASS ?? '',
    PROXY_HOST: s.PROXY_HOST ?? '',
    PROXY_PORT: s.PROXY_PORT ?? '',
  }
}

/** Estado de todas as configurações para o painel (segredos vêm mascarados). */
export async function getSettingsStatus(): Promise<SettingStatus[]> {
  const { values } = await getSnapshot(true)
  return SETTING_DEFINITIONS.map((def) => {
    const value = values.get(def.key)
    return {
      key: def.key,
      hasValue: Boolean(value),
      value: def.secret ? '' : (value ?? ''),
      preview: def.secret && value ? maskSecret(value) : '',
    }
  })
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

export class SettingsValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super('Algumas configurações são inválidas.')
    this.name = 'SettingsValidationError'
  }
}

/**
 * Salva alterações. Para cada chave: texto = grava; `null` ou vazio = remove.
 * Chaves ausentes em `changes` não são tocadas.
 */
export async function updateSettings(
  changes: Record<string, unknown>,
): Promise<{ updated: SettingKey[]; removed: SettingKey[] }> {
  const errors: Record<string, string> = {}
  const upserts: { key: SettingKey; value: string; secret: boolean }[] = []
  const removed: SettingKey[] = []

  for (const [rawKey, rawValue] of Object.entries(changes)) {
    const def = SETTING_DEFINITIONS.find((d) => d.key === rawKey)
    if (!def) {
      errors[rawKey] = 'Configuração desconhecida.'
      continue
    }
    if (rawValue === null) {
      removed.push(def.key)
      continue
    }
    if (typeof rawValue !== 'string') {
      errors[def.key] = 'Valor inválido.'
      continue
    }
    const value = rawValue.trim()
    if (value === '') {
      removed.push(def.key)
      continue
    }
    const problem = def.validate?.(value)
    if (problem) {
      errors[def.key] = problem
      continue
    }
    upserts.push({ key: def.key, value, secret: def.secret })
  }

  if (Object.keys(errors).length > 0) throw new SettingsValidationError(errors)

  await ensureTable()

  if (upserts.length > 0) {
    await sql.query(
      `INSERT INTO app_settings (key, value, is_secret, updated_at)
       SELECT k, v, s, NOW() FROM unnest($1::text[], $2::text[], $3::boolean[]) AS t(k, v, s)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, is_secret = EXCLUDED.is_secret, updated_at = NOW()`,
      [
        upserts.map((u) => u.key),
        upserts.map((u) => (u.secret ? encrypt(u.value) : u.value)),
        upserts.map((u) => u.secret),
      ],
    )
  }

  if (removed.length > 0) {
    await sql.query('DELETE FROM app_settings WHERE key = ANY($1::text[])', [removed])
  }

  invalidateSettingsCache()
  return { updated: upserts.map((u) => u.key), removed }
}

/** Aplica o fuso horário salvo no banco ao processo atual. */
export async function applyTimezoneFromSettings(): Promise<void> {
  const tz = await getSetting('TZ')
  if (tz && process.env.TZ !== tz) {
    process.env.TZ = tz
    console.log(`[settings] Fuso horário aplicado: ${tz}`)
  }
}
