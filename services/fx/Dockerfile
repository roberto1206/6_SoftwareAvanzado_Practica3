FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copiar package files
COPY services/fx/package*.json ./
RUN npm ci

# 2. Copiar contracts COMPLETOS (esto es lo que falta)
COPY contracts/ ./contracts/

# 3. Copiar código de FX
COPY services/fx/ ./

# 4. Build
RUN npm run build

# --- Production ---
FROM node:20-alpine

WORKDIR /app

# Copiar dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# ⚠️ CRÍTICO: Copiar contracts en producción también
COPY contracts/ ./contracts/

COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 50055

CMD ["node", "dist/main.js"]