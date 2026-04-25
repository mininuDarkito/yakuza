# Etapa 1: Dependências e Build
FROM node:22-slim AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copia arquivos de definição de pacotes
COPY pnpm-lock.yaml package.json ./
COPY prisma ./prisma/

# Instala dependências (incluindo dev para o build)
RUN pnpm install --frozen-lockfile

# Copia o restante do código e gera o Prisma Client
COPY . .
RUN npx prisma generate
RUN pnpm build

# Etapa 2: Runner de Produção
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

# Copia apenas o necessário para rodar (Standalone do Next.js se configurado, ou build padrão)
# Para standalone precisaria de config extra no next.config.js, vamos usar o padrão por enquanto mas limpando node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Script para rodar migrations (opcional) e iniciar
CMD ["pnpm", "start"]