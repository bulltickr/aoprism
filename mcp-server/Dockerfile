# AOPRISM MCP Server Hub - Dockerfile
# Multi-stage build for production deployment

FROM node:20-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY mcp-server/package*.json ./
RUN npm ci --only=production

# Production stage
FROM base AS runner
ENV NODE_ENV=production
ENV MCP_PORT=3002
ENV MCP_HOST=0.0.0.0

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcpuser

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy server code
COPY mcp-server/src ./src
COPY mcp-server/package.json ./

# Copy mcp-platform tools (needed for imports)
COPY mcp-platform/src/tools ../mcp-platform/src/tools
COPY mcp-platform/src/ao-client.js ../mcp-platform/src/
COPY mcp-platform/package.json ../mcp-platform/

# Change ownership
RUN chown -R mcpuser:nodejs /app
USER mcpuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3002/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start server
CMD ["node", "src/http-server.js"]
