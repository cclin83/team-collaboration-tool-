---
name: render-docker-deploy
description: Deploy a Node.js full-stack app (Express + React/Vite) to Render using Docker. Covers Dockerfile configuration, Supabase integration, environment variables, and common pitfalls. Use when deploying to Render, debugging Render Docker builds, migrating databases from SQLite to Supabase, or troubleshooting Render deployment issues. Triggers on "deploy to Render", "Render Docker", "Render deployment", "Supabase migration", "Dockerfile for Render".
---

# Render Docker Deploy

Deploy and maintain a Node.js full-stack application on Render using Docker.

## Key Lessons & Pitfalls

### 1. Render Docker vs render.yaml

Render supports two deployment modes. Check which one your service uses — it's shown as a label (e.g., "Docker" or "Node") on the service page in Render Dashboard.

- **Docker mode**: Uses `Dockerfile` in the repo. `render.yaml` build/start commands are IGNORED.
- **Native mode**: Uses `render.yaml` build/start commands. `Dockerfile` is ignored.

If the service shows "Docker", only modify the `Dockerfile` — changes to `render.yaml` build commands have no effect.

### 2. NODE_ENV=production breaks Docker builds

Render injects `NODE_ENV=production` into the build environment. When `npm ci` or `npm install` runs with `NODE_ENV=production`, all `devDependencies` are skipped. Build tools like `vite`, `tsc`, `typescript` are typically in `devDependencies`.

**Fix**: Set `ENV NODE_ENV=development` in the builder stage of the Dockerfile:

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_ENV=development

COPY server/package*.json ./server/
RUN cd server && npm ci --include=dev
# ...

COPY client/package*.json ./client/
RUN cd client && npm ci --include=dev
# ...
```

### 3. Do NOT hardcode PORT in Dockerfile

Render injects its own `PORT` environment variable (usually 10000) and routes traffic to that port. If you set `ENV PORT=3001` in the Dockerfile, it overrides Render's value — the app listens on 3001 but Render sends traffic to 10000 → health check fails → deploy fails or serves stale content.

**Fix**: Remove `ENV PORT=...` from Dockerfile. Let the app code handle it:

```typescript
const PORT = parseInt(process.env.PORT || '3001');
```

Only keep `EXPOSE` as documentation:

```dockerfile
EXPOSE 3001
```

### 4. Dockerfile template for full-stack Node.js app

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app

# Ensure devDependencies are installed during build
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

CMD ["node", "server/dist/index.js"]
```

### 5. SQLite to Supabase migration checklist

When migrating from SQLite to Supabase PostgreSQL:

1. **Dependencies**: Remove `better-sqlite3` / `@types/better-sqlite3`, add `@supabase/supabase-js` / `dotenv`
2. **database.ts**: Replace SQLite init with Supabase client (`createClient`)
3. **routes.ts**: Convert all sync SQLite calls to `async/await` Supabase queries
4. **Dockerfile**: Remove native build tools (`python3`, `make`, `g++`) that were needed for `better-sqlite3`
5. **Environment variables**: Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render Dashboard → Environment
6. **.env**: Create `server/.env` for local development (must be in `.gitignore`)
7. **UUID columns**: Supabase uses real UUID type. Filters like `.neq('id', '')` fail — use `.not('id', 'is', null)` instead

### 6. Render deployment debugging

When changes don't appear after deploy:

1. **Check deployment mode** — Is it Docker or Native? Look at the label on the service page.
2. **Check the right file** — Navigation labels, page titles, and component text may be in different files. `grep -r "text" client/src/` to find all occurrences.
3. **Verify the build output** — `curl -s <url>/ | grep "index-"` to check if the JS filename changed (Vite hashes by content).
4. **Check JS content** — `curl -s <url>/assets/<filename>.js | grep -o "expected_text"` to verify the text is in the deployed JS.
5. **Clear build cache** — In Render Dashboard: Manual Deploy → Clear build cache & deploy.
6. **Browser cache** — Use incognito window or `Ctrl+Shift+R` to force refresh.
7. **Nuclear option** — Delete the service and recreate it. Data is safe if using external DB (Supabase).

### 7. Render free tier behavior

- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- No persistent disk on free tier
- Auto-deploy triggers on push to connected branch

### 8. Git authentication in Ona environments

Ona environments cloned via `git clone` don't have Git credentials configured. To push:

1. Generate a GitHub PAT at `github.com/settings/tokens/new?scopes=repo`
2. Set remote URL: `git remote set-url origin https://<user>:<token>@github.com/<user>/<repo>.git`

For environments created through Ona projects, Git auth is automatic.
