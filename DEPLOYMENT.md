# Innovexa Ops Console — Deployment Guide

Comprehensive instructions for deploying Innovexa Ops Console across production environments including Docker, Vercel, Heroku, and automated CI/CD pipelines.

---

## 🤖 AI Agent Environment Configuration

Ensure the following API credentials and storage settings are configured in production:

```env
# AI Engine Credentials
OPENAI_API_KEY="sk-proj-your-openai-api-key"

# Google Meet & Calendar OAuth 2.0 Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://innovexa.com/auth/google/callback"
GOOGLE_EMAIL="ai-agent@innovexa.com"
GOOGLE_PASSWORD="your-google-account-password"

# Zoom API & Web SDK Integration
ZOOM_API_KEY="your-zoom-app-key"
ZOOM_API_SECRET="your-zoom-app-secret"

# Redis Queue (Bull / SQS Queue Runner for transcription jobs)
REDIS_URL="redis://localhost:6379"

# S3 / Supabase Encrypted Storage Bucket
STORAGE_BUCKET_URL="https://storage.innovexa.com/recordings"
RETENTION_DAYS="30"
```

---

## 🐳 Docker Deployment

### Multi-Stage `Dockerfile` & `docker-compose.yml`

```bash
# Build and launch multi-container application with PostgreSQL 15 and Redis
docker-compose up -d --build

# Sync Prisma database schema inside container
docker-compose exec app npx prisma db push
```

---

## ☁️ Vercel Deployment

Execute production deployment:
```bash
npx vercel --prod
```
Ensure `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, and `ZOOM_API_KEY` environment variables are set in the Vercel Project Settings.

---

## 📦 S3 & Supabase Storage Environment Variables

Configure either AWS S3 or Supabase Storage for remote hosting of audio recordings:

```env
# AWS S3 Storage Provider
AWS_REGION="us-east-1"
S3_BUCKET="innovexa-recordings"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"

# Supabase Storage Provider
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-key"
```

*Note: If neither provider is configured, the console automatically falls back to local disk storage (`public/recordings/`) for development and testing.*

---

## 🤖 Ghost Caller Bot Deployment (`innovexa-meet-bot`)

Run the containerized Playwright & PulseAudio bot service:

```bash
cd innovexa-meet-bot
docker-compose up -d --build
```

### Environment Configuration
```env
BOT_NAME="Innovexa Notetaker"
PULSE_SERVER="unix:/run/user/1000/pulse/native"
N8N_WEBHOOK_URL="http://n8n:5678/webhook/innovexa-meeting"
LOG_LEVEL="info"
```


