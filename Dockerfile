# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY src/ src/
COPY scripts/ scripts/
COPY drizzle/ drizzle/
COPY tsconfig*.json ./
COPY drizzle.config.ts ./

# Build server and client
RUN bun run build

# Production stage
FROM oven/bun:1.3-slim AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 bussy && \
    adduser --system --uid 1001 --gid 1001 bussy

# Copy dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Switch to non-root user
USER bussy

# Default environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun --eval "fetch('http://localhost:3000/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["bun", "run", "dist/server/Program.js"]
