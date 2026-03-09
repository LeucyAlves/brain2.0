# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js (standalone output)
RUN npm run build

# ---- Stage 3: Production ----
FROM node:22-alpine AS runner
RUN apk add --no-cache tini

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy data example files (used as defaults on first run)
COPY --from=builder /app/data/*.example.json ./data/

# better-sqlite3 needs the native binding and its resolution helpers
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Data directory for SQLite DBs and JSON state
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Scripts for data collection
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
