# MeetIQ Ops Console — Deployment Guide

Comprehensive instructions for deploying MeetIQ Ops Console across production environments including Docker, Vercel, Heroku, and automated CI/CD pipelines.

---

## 🐳 Docker Deployment

### 1. Multi-Stage `Dockerfile`

Create `Dockerfile` in the project root:

```dockerfile
# Step 1: Base image
FROM node:18-alpine AS builder
WORKDIR /app

# Step 2: Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Step 3: Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Step 4: Production runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
```

### 2. `docker-compose.yml`

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: meetiq_postgres
    restart: always
    environment:
      POSTGRES_USER: meetiq_admin
      POSTGRES_PASSWORD: SecretPassword123!
      POSTGRES_DB: meetiq_production
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: meetiq_app
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgres://meetiq_admin:SecretPassword123!@postgres:5432/meetiq_production?sslmode=disable"
      DIRECT_URL: "postgres://meetiq_admin:SecretPassword123!@postgres:5432/meetiq_production?sslmode=disable"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Build & Execution Commands
```bash
# Build and launch services
docker-compose up -d --build

# Run database migrations inside container
docker-compose exec app npx prisma db push
```

---

## ☁️ Vercel Deployment (Serverless PostgreSQL)

1. Connect repository to [Vercel](https://vercel.com).
2. Provision serverless PostgreSQL (e.g., Neon.tech).
3. Configure Environment Variables in Vercel Dashboard:
   - `DATABASE_URL`: `postgres://neondb_owner:password@ep-pooler.c-4.aws.neon.tech/neondb?sslmode=require&pgbouncer=true`
   - `DIRECT_URL`: `postgres://neondb_owner:password@ep-direct.c-4.aws.neon.tech/neondb?sslmode=require`
4. Execute deployment:
   ```bash
   npx vercel --prod
   ```

---

## 🟣 Heroku Deployment

```bash
# 1. Login & create app
heroku login
heroku create meetiq-ops-console

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# 3. Configure environment variables
heroku config:set DATABASE_URL=$(heroku config:get DATABASE_URL)
heroku config:set DIRECT_URL=$(heroku config:get DATABASE_URL)

# 4. Deploy codebase
git push heroku main

# 5. Run Prisma migrations on Heroku
heroku run npx prisma db push
```

---

## ⚙️ CI/CD Pipeline & Lighthouse CI

Create `.github/workflows/ci.yml`:

```yaml
name: MeetIQ CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_meetiq
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js 18
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client & Migrate DB
        env:
          DATABASE_URL: "postgres://test_user:test_password@localhost:5432/test_meetiq?sslmode=disable"
          DIRECT_URL: "postgres://test_user:test_password@localhost:5432/test_meetiq?sslmode=disable"
        run: |
          npx prisma generate
          npx prisma db push

      - name: Run Build
        run: npm run build

      - name: Run Automated Test Suite
        run: npm test

      - name: Run Lighthouse CI Audit
        run: |
          npm install -g @lhci/cli
          lhci autorun --collect.staticDistDir=.next
```
