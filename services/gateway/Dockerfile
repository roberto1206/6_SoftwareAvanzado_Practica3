# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY services/gateway/package.json services/gateway/package-lock.json ./
RUN npm ci

# Copiar contracts desde la raíz
COPY contracts/ ./contracts/

# Copiar el código del servicio gateway
COPY services/gateway/ ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

# curl para healthcheck HTTP
RUN apk add --no-cache curl

ENV NODE_ENV=production
COPY services/gateway/package.json services/gateway/package-lock.json ./
RUN npm ci --omit=dev

# Copiar contracts y el código compilado
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]