# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copiar package.json del servicio PRICING (estaba copiando gateway!)
COPY services/pricing/package.json services/pricing/package-lock.json ./
RUN npm ci

# Copiar contracts desde la raíz
COPY contracts/ ./contracts/

# Copiar el código del servicio pricing
COPY services/pricing/ ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache busybox-extras

ENV NODE_ENV=production
# Copiar package.json de PRICING (estaba copiando gateway!)
COPY services/pricing/package.json services/pricing/package-lock.json ./
RUN npm ci --omit=dev

# Copiar contracts y el código compilado
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 50052
CMD ["node", "dist/main.js"]