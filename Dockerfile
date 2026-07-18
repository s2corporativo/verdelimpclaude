# Verdelimp ERP — produção em VPS Contabo
# Stack: Next.js 14 + Prisma 6 + Node 20

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# O postinstall roda `prisma generate`, que precisa do schema — por isso o
# prisma/ é copiado ANTES do npm ci (senão o build falha com "schema not found").
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build standalone: só o servidor compilado + node_modules mínimos do trace —
# a imagem antiga carregava node_modules completo COM devDependencies (vitest,
# eslint, prisma CLI) e o src/, triplicando o tamanho e a superfície de ataque.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# prisma/ para `migrate deploy` no deploy.sh (CLI vem do npx no host do deploy)
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 3000
# O Docker injeta HOSTNAME=<id do container>; o server.js standalone usa essa
# env para o bind e quebraria o healthcheck em 127.0.0.1 — forçar 0.0.0.0.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
CMD ["node", "server.js"]
