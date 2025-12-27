FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copiar solo package files de gateway
COPY services/gateway/package*.json ./
RUN npm ci

# 2. Copiar contracts (proto files)
COPY contracts/ ./contracts/

# 3. Copiar SOLO código de gateway
COPY services/gateway/ ./

# 4. Build
RUN npm run build

# --- Production ---
FROM node:20-alpine

WORKDIR /app

# Copiar node_modules y build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY contracts/ ./contracts/
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]