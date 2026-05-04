# =================== Build Stage ===================
FROM node:20-alpine AS builder

# Prisma engines need OpenSSL at build time; Alpine minimal image omits it by default.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma

RUN npm install --legacy-peer-deps

COPY tsconfig.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build && (test -f dist/main.js || test -f dist/src/main.js)

# =================== Runtime Stage ===================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --omit=dev --legacy-peer-deps && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Sync schema and launch.
# `db push` is used (not `migrate deploy`) so the project works out-of-the-box
# on first run without committing a migration history. Prisma will refuse the
# push if it would lose data - that's the desired safety behavior. For a
# bigger production deployment, generate proper migrations with `prisma
# migrate dev` and switch this to `prisma migrate deploy`.
CMD ["sh", "-c", "npx prisma db push --skip-generate && (node dist/main.js || node dist/src/main.js)"]
