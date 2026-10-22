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

# Desativa telemetria do Next.js durante o build
ENV NEXT_TELEMETRY_DISABLED=1

# ID único do deploy (proteção contra version skew / chunks 404 após redeploy).
# Passe --build-arg NEXT_DEPLOYMENT_ID=$(git rev-parse --short HEAD) no CI; sem isso usa o timestamp.
ARG NEXT_DEPLOYMENT_ID

# Build do projeto usando o script otimizado (gera prisma, compila Next e sincroniza static + playwright)
RUN export NEXT_DEPLOYMENT_ID="${NEXT_DEPLOYMENT_ID:-build-$(date +%s)}" && pnpm run build

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
COPY --from=builder /app/server-start.js ./server-start.js
COPY --from=builder /app/healthcheck.js ./healthcheck.js

# Garante que o Prisma Engine e módulos externos (Playwright) estejam disponíveis no runner
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/playwright ./node_modules/playwright

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Falha se o servidor subir sem os assets estáticos (sintoma: 404 em /_next/static)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "healthcheck.js"]

# O Playwright já vem instalado na imagem base noble, 
# mas precisamos garantir que os navegadores estejam no caminho certo para o usuário nextjs
RUN npx playwright install chromium

CMD ["node", "server.js"]