# Etapa 1: Instalação de dependências
FROM node:22-slim AS deps
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# Instala o pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia arquivos de definição de pacotes
COPY package.json pnpm-lock.yaml* ./

# Instala todas as dependências
RUN pnpm i --frozen-lockfile

# Etapa 2: Builder (Compilação do Next.js)
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o Prisma Client
RUN npx prisma generate

# Desativa telemetria do Next.js durante o build
ENV NEXT_TELEMETRY_DISABLED=1

# Build do projeto (Standalone mode configurado no next.config.js)
RUN pnpm next build

# Etapa 3: Runner (Imagem final de produção)
# Usamos a imagem oficial do Playwright para garantir que todos os drivers e libs do Linux estejam lá
FROM mcr.microsoft.com/playwright:v1.50.0-noble AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os arquivos necessários do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Garante que o Prisma Engine esteja disponível
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# O Playwright já vem instalado na imagem base noble, 
# mas precisamos garantir que os navegadores estejam no caminho certo para o usuário nextjs
RUN npx playwright install chromium

CMD ["node", "server.js"]