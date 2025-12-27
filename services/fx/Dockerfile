# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app/services/fx

COPY services/fx/package*.json ./
COPY services/fx/tsconfig*.json ./
RUN npm ci --legacy-peer-deps

COPY services/fx/src ./src
COPY contracts/ ./contracts/

RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app/services/fx

COPY services/fx/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY contracts/ ./contracts/
COPY --from=builder /app/services/fx/dist ./dist

EXPOSE 3001 50055
CMD ["node", "dist/main.js"]
