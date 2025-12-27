# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# 1. Copiar dependencias específicas de fx
COPY services/fx/package*.json ./
RUN npm ci --legacy-peer-deps

# 2. Copiar contratos (proto) desde la raíz del contexto
COPY contracts/ ./contracts/

# 3. Copiar código fuente y construir
COPY services/fx/ ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar nc para healthchecks si es necesario
RUN apk add --no-cache busybox-extras

ENV NODE_ENV=production

# 4. Dependencias de producción
COPY services/fx/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# 5. Copiar artefactos y contratos necesarios para gRPC/proto
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 3001 50055
CMD ["node", "dist/main.js"]