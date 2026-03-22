# Deployment Guide

## Platform

Deploy to [Vercel](https://vercel.com). Import the repository and Vercel will detect Next.js automatically. No build command changes are needed.

## Environment Variables

Set all of the following in **Vercel → Project → Settings → Environment Variables**.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project → Settings → API → Project URL |
| `NEXT_PUBLIC_ANON_KEY` | Supabase Dashboard → Project → Settings → API → Project API keys → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project → Settings → API → Project API keys → `service_role` (keep secret) |
| `DATABASE_URL` | Supabase Dashboard → Project → Settings → Database → Connection string → URI (use the **Transaction** pooler URI for serverless) |
| `RESEND_API_KEY` | [Resend](https://resend.com) → API Keys → Create API Key |
| `EMAIL_FROM` | The verified sender address configured in Resend (e.g. `noreply@yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://app.siteflo.io` (no trailing slash) |
| `CRON_SECRET` | A long random string you generate — used to authenticate Vercel cron requests to `/api/cron/*`. Generate with: `openssl rand -hex 32` |

## Cron Jobs

Defined in `vercel.json` — Vercel picks these up automatically on deploy. No extra configuration needed.

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/contract-renewal` | `0 8 * * *` (08:00 UTC daily) | Sends contract renewal reminders |
| `/api/cron/automation` | `*/15 * * * *` (every 15 min) | Processes automation rules and triggers |

The cron routes verify the `Authorization: Bearer <CRON_SECRET>` header — make sure `CRON_SECRET` is set before the first deploy.

## Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add your production URL to **Redirect URLs**:

```
https://app.siteflo.io/**
```

## First Deploy Checklist

- [ ] All environment variables set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set to the production domain
- [ ] Supabase redirect URL updated
- [ ] Database migrations run (`npx drizzle-kit migrate`)
- [ ] Resend sender domain verified
