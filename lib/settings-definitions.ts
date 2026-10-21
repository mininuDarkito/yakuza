/**
 * Definições das configurações do sistema que ficam no BANCO DE DADOS
 * (tabela `app_settings`) e são editadas em Admin › Configurações.
 *
 * Este arquivo é "puro" (sem imports de Node) para poder ser usado tanto no
 * servidor (lib/settings.ts) quanto no formulário do painel (client component).
 *
 * Permanecem no .env apenas: DATABASE_URL, NEXTAUTH_SECRET e NEXTAUTH_URL.
 */

export const SETTING_KEYS = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_YAKUZA',
  'PROXY_HOST',
  'PROXY_PORT',
  'PROXY_USER',
  'PROXY_PASS',
  'CLOUDINARY_URL',
  'CRON_SECRET',
  'TZ',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export type SettingGroup = 'discord' | 'proxy' | 'cloudinary' | 'sistema'

export interface SettingDefinition {
  key: SettingKey
  group: SettingGroup
  label: string
  description: string
  /** Valores secretos são criptografados no banco e nunca voltam inteiros para o navegador. */
  secret: boolean
  placeholder?: string
  /** Nomes antigos de variáveis de ambiente usados apenas na importação inicial do .env. */
  legacyEnv?: string[]
  /** Retorna a mensagem de erro ou null quando o valor é válido. */
  validate?: (value: string) => string | null
}

/** Estado de uma configuração enviado ao painel (nunca contém o valor de um segredo). */
export interface SettingStatus {
  key: SettingKey
  hasValue: boolean
  /** Valor atual (vazio para segredos). */
  value: string
  /** Prévia mascarada para segredos (ex.: ••••••••a1b2). */
  preview: string
}

export const SETTING_GROUPS: Record<
  SettingGroup,
  { title: string; description: string }
> = {
  discord: {
    title: 'Discord',
    description:
      'Login OAuth, bot de logs/mensagens e servidor (guild) usado para listar canais.',
  },
  proxy: {
    title: 'Proxy dos Scrapers',
    description: 'Proxy HTTP usado pelos scrapers Piccoma, LINE Manga e Honto.',
  },
  cloudinary: {
    title: 'Cloudinary',
    description: 'Armazenamento das capas das séries.',
  },
  sistema: {
    title: 'Sistema',
    description: 'Agendador (cron) interno e fuso horário do servidor.',
  },
}

const isSnowflake = (v: string) =>
  /^\d{5,25}$/.test(v) ? null : 'Use apenas números (ID do Discord).'

const isPort = (v: string) =>
  /^\d{1,5}$/.test(v) && Number(v) >= 1 && Number(v) <= 65535
    ? null
    : 'Porta inválida (use um número entre 1 e 65535).'

const isHost = (v: string) =>
  /^[a-zA-Z0-9.-]+$/.test(v) ? null : 'Host inválido (ex.: 192.168.0.10 ou proxy.exemplo.com).'

const isTimezone = (v: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return null
  } catch {
    return 'Fuso horário inválido (ex.: America/Sao_Paulo).'
  }
}

const isCloudinaryUrl = (v: string) =>
  /^cloudinary:\/\/[^:\s]+:[^@\s]+@[^\s/]+$/.test(v)
    ? null
    : 'Formato esperado: cloudinary://API_KEY:API_SECRET@CLOUD_NAME'

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: 'DISCORD_CLIENT_ID',
    group: 'discord',
    label: 'Client ID (OAuth)',
    description: 'Application ID do app no Discord Developer Portal.',
    secret: false,
    placeholder: '1449192213375488140',
    validate: isSnowflake,
  },
  {
    key: 'DISCORD_CLIENT_SECRET',
    group: 'discord',
    label: 'Client Secret (OAuth)',
    description: 'Segredo OAuth2 do app. Usado no login com Discord.',
    secret: true,
    placeholder: 'Cole o Client Secret',
  },
  {
    key: 'DISCORD_BOT_TOKEN',
    group: 'discord',
    label: 'Bot Token',
    description: 'Token do bot que envia logs/mensagens e lista os canais do servidor.',
    secret: true,
    placeholder: 'Cole o token do bot',
  },
  {
    key: 'DISCORD_YAKUZA',
    group: 'discord',
    label: 'ID do Servidor (Guild)',
    description: 'Servidor do Discord cujos canais são listados e onde os usuários precisam estar.',
    secret: false,
    placeholder: '1385343298943844442',
    legacyEnv: ['NEXT_PUBLIC_DISCORD_GUILD_ID'],
    validate: isSnowflake,
  },
  {
    key: 'PROXY_HOST',
    group: 'proxy',
    label: 'Host',
    description: 'Endereço do servidor proxy.',
    secret: false,
    placeholder: '14.137.246.211',
    validate: isHost,
  },
  {
    key: 'PROXY_PORT',
    group: 'proxy',
    label: 'Porta',
    description: 'Porta do servidor proxy.',
    secret: false,
    placeholder: '59100',
    validate: isPort,
  },
  {
    key: 'PROXY_USER',
    group: 'proxy',
    label: 'Usuário',
    description: 'Usuário de autenticação do proxy.',
    secret: false,
    placeholder: 'usuario',
  },
  {
    key: 'PROXY_PASS',
    group: 'proxy',
    label: 'Senha',
    description: 'Senha de autenticação do proxy.',
    secret: true,
    placeholder: 'Cole a senha do proxy',
  },
  {
    key: 'CLOUDINARY_URL',
    group: 'cloudinary',
    label: 'Cloudinary URL',
    description: 'Formato: cloudinary://API_KEY:API_SECRET@CLOUD_NAME. Sem ele, as imagens ficam como URL/Base64 original.',
    secret: true,
    placeholder: 'cloudinary://API_KEY:API_SECRET@CLOUD_NAME',
    validate: isCloudinaryUrl,
  },
  {
    key: 'CRON_SECRET',
    group: 'sistema',
    label: 'Segredo do Cron',
    description: 'Protege o endpoint interno /api/cron/mechacomic chamado pelo agendador.',
    secret: true,
    placeholder: 'Defina um segredo longo e aleatório',
  },
  {
    key: 'TZ',
    group: 'sistema',
    label: 'Fuso horário',
    description: 'Fuso horário do processo do servidor (aplicado imediatamente ao salvar).',
    secret: false,
    placeholder: 'America/Sao_Paulo',
    validate: isTimezone,
  },
]

/** Variáveis que continuam obrigatoriamente no .env. */
export const ENV_ONLY_VARIABLES = [
  { name: 'DATABASE_URL', description: 'Conexão com o PostgreSQL (precisa existir antes de ler qualquer configuração).' },
  { name: 'NEXTAUTH_SECRET', description: 'Assina as sessões e também protege (criptografa) os segredos guardados no banco.' },
  { name: 'NEXTAUTH_URL', description: 'URL pública do site, usada pelo NextAuth.' },
] as const
