-- NoShow — Initial Schema
-- Run this in Supabase SQL Editor or via CLI

-- ────────────────────────────────────────
-- 1. users (public profile, mirrors auth.users)
-- ────────────────────────────────────────
CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL UNIQUE,
  business_name   text NOT NULL,
  plan            text NOT NULL DEFAULT 'trial',  -- trial | solo | business | pro
  trial_ends_at   timestamptz,
  stripe_customer_id text,
  timezone        text NOT NULL DEFAULT 'UTC',
  sms_template_24h text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────
-- 2. clients
-- ────────────────────────────────────────
CREATE TABLE public.clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text NOT NULL,
  email      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients: owner full access"
  ON public.clients
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────
-- 3. appointments
-- ────────────────────────────────────────
CREATE TABLE public.appointments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_name       text NOT NULL,
  scheduled_at       timestamptz NOT NULL,
  status             text NOT NULL DEFAULT 'scheduled',
                     -- scheduled | confirmed | cancelled | completed | no_show
  reminder_24h_sent  boolean NOT NULL DEFAULT false,
  reminder_2h_sent   boolean NOT NULL DEFAULT false,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointments: owner full access"
  ON public.appointments
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX appointments_scheduled_at_idx ON public.appointments (scheduled_at);
CREATE INDEX appointments_user_id_idx      ON public.appointments (user_id);
CREATE INDEX appointments_client_id_idx    ON public.appointments (client_id);

-- ────────────────────────────────────────
-- 4. reminder_logs
-- ────────────────────────────────────────
CREATE TABLE public.reminder_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  type           text NOT NULL,  -- sms_24h | sms_2h | email_confirm
  sent_at        timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL,  -- sent | failed
  error_message  text
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reminder logs: owner can view"
  ON public.reminder_logs FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.appointments
      WHERE id = reminder_logs.appointment_id
    )
  );
