# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY services/orders/package.json services/orders/package-lock.json ./
RUN npm ci

# Copiar contracts desde la raíz
COPY contracts/ ./contracts/

# Copiar el código del servicio orders
COPY services/orders/ ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

# nc para healthcheck TCP
RUN apk add --no-cache busybox-extras

ENV NODE_ENV=production
# Copiar package.json de ORDERS (estaba copiando gateway!)
COPY services/orders/package.json services/orders/package-lock.json ./
RUN npm ci --omit=dev

# Copiar contracts y el código compilado
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 50053
CMD ["node", "dist/main.js"]