# NoShow

**Stop losing clients to no-shows.** Automated SMS & Email appointment reminders for small service businesses — salons, trainers, dentists, consultants.

## What it does

- Sends SMS reminders 24h and 2h before each appointment (Twilio)
- Sends email confirmations with Google Calendar links (Resend)
- Clients reply YES to confirm or NO to cancel — status updates automatically
- Full appointment management dashboard with filters and status tracking

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| SMS | Twilio |
| Email | Resend |
| Payments | Stripe |
| Deploy | Vercel |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `RESEND_API_KEY` | Resend API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_SOLO` | Stripe Price ID for Solo plan |
| `STRIPE_PRICE_BUSINESS` | Stripe Price ID for Business plan |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `CRON_SECRET` | Secret for protecting the cron endpoint |

## Pricing

| Plan | Price | Clients |
|---|---|---|
| Solo | $19/mo | Up to 50 |
| Business | $49/mo | Up to 200 |
| Pro | $99/mo | Unlimited |

## Database

Run the migration in `supabase/migrations/` via the Supabase SQL Editor to create all tables (users, clients, appointments, reminder_logs) with RLS enabled.

## Deployment

Deploy to Vercel. Add all env vars in the Vercel dashboard. The cron job at `/api/send-reminders` runs daily at 8am UTC.
