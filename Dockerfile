FROM node:20-slim AS builder

WORKDIR /app

# Build server
COPY server/package*.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npx tsc

# Build client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npx vite build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
