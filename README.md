# NoShow

> Previously shipped as **Remindly** · Live at **[noshow.pro](https://noshow.pro)**

Appointment reminder SaaS for small service businesses (salons, barbershops, trainers, clinics). Sends automated SMS reminders 24 h before each appointment; clients reply YES/NO to confirm or cancel.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — auth, Postgres database
- **Stripe** — subscriptions (Solo / Business / Pro plans)
- **Twilio** — outbound SMS reminders + inbound webhook for client replies
- **Resend** — transactional email confirmations
- **Tailwind CSS** — dark UI (`#111111` / `#e8502a`)

## Features

- Dashboard with stat cards, no-show rate chart, and today's appointment table
- Client CRM — add, edit, search clients
- New appointment form — date chips, time picker, 60-day look-ahead
- Automatic SMS reminder 24 h before + confirmation on client reply
- Settings — business name, timezone, custom SMS template
- Billing portal via Stripe Customer Portal

## Local setup

```bash
cp .env.example .env.local   # fill in Supabase, Stripe, Twilio, Resend keys
npm install
npm run dev
```
