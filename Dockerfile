# Dockerfile para produção - Next.js Frontend
FROM node:22-slim AS base

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração do pnpm
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Stage para instalar dependências
FROM base AS deps
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Stage para build da documentação
FROM base AS docs-builder

# Copiar script de build da documentação
COPY scripts/build-docs.sh ./scripts/

# Copiar documentação
COPY docs-site ./docs-site

# Instalar dependências da documentação
WORKDIR /app/docs-site
RUN npm install

# Voltar para o diretório principal
WORKDIR /app

# Build da documentação
RUN chmod +x scripts/build-docs.sh && ./scripts/build-docs.sh

# Stage para build da aplicação
FROM base AS builder

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Definir variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build da aplicação Next.js
RUN pnpm run build

# Stage final - runtime
FROM node:22-slim AS runtime

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Definir diretório de trabalho
WORKDIR /app

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Criar diretórios necessários
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar documentação buildada
COPY --from=docs-builder /app/public/docs ./public/docs

# Copiar build output do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Expor porta (Cloud Run usa 8080 por padrão)
EXPOSE 8080

# Mudar para usuário não-root
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8080/ || exit 1

# Comando para iniciar a aplicação
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
