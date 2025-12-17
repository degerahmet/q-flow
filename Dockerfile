# Base Stage
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
RUN npm install turbo --global
RUN npm install pnpm --global

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=api --docker

FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

RUN turbo run build --filter=api...

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json .
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

EXPOSE 3000
ENV PORT 3000
CMD ["node", "dist/main"]