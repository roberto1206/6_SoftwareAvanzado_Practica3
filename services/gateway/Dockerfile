# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# deps
COPY services/fx/package.json services/fx/package-lock.json ./
RUN npm ci

# code
COPY services/fx/ ./

# contracts (proto)
COPY contracts/ ./contracts/

# build
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# deps prod
COPY services/fx/package.json services/fx/package-lock.json ./
RUN npm ci --omit=dev

# compiled + contracts
COPY --from=build /app/dist ./dist
COPY --from=build /app/contracts ./contracts

EXPOSE 3001 50055
CMD ["node", "dist/main.js"]
