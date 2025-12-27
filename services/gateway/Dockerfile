# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# 1. Dependencias
COPY services/orders/package*.json ./
RUN npm ci --legacy-peer-deps

# 2. Contratos y Código
COPY contracts/ ./contracts/
COPY services/orders/ ./

# 3. Build
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache busybox-extras

ENV NODE_ENV=production

# 4. Solo producción
COPY services/orders/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# 5. Artefactos
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 50053
CMD ["node", "dist/main.js"]