FROM node:20-slim AS builder

WORKDIR /app

# Force development mode during build so devDependencies are installed
ENV NODE_ENV=development

# Build server
COPY server/package*.json ./server/
RUN cd server && npm ci --include=dev
COPY server/ ./server/
RUN cd server && npx tsc

# Build client
COPY client/package*.json ./client/
RUN cd client && npm ci --include=dev
COPY client/ ./client/
RUN cd client && npx vite build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
