# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy proto files and shared contracts
COPY contracts ./contracts

# Copy FX service files
COPY services/fx/package*.json ./services/fx/
COPY services/fx/tsconfig*.json ./services/fx/

# Install dependencies
WORKDIR /app/services/fx
RUN npm install --legacy-peer-deps

# Copy source code
COPY services/fx/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/fx/package*.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copy proto files (needed for gRPC runtime)
COPY contracts ./contracts

# Copy built application from builder
COPY --from=builder /app/services/fx/dist ./dist

# Expose ports (HTTP and gRPC)
EXPOSE 3001 50055

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/fx/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
CMD ["node", "dist/main.js"]
