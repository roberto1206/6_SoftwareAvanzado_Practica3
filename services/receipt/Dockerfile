# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY services/receipt/package.json services/receipt/package-lock.json ./
RUN npm ci

# Copiar contracts desde la raíz
COPY contracts/ ./contracts/

# Copiar el código del servicio receipt
COPY services/receipt/ ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache busybox-extras

ENV NODE_ENV=production
COPY services/receipt/package.json services/receipt/package-lock.json ./
RUN npm ci --omit=dev

# Copiar contracts y el código compilado
COPY contracts/ ./contracts/
COPY --from=build /app/dist ./dist

EXPOSE 50054
CMD ["node", "dist/main.js"]