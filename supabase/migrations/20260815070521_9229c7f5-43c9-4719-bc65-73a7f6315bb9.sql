ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminders text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminders text[] NOT NULL DEFAULT '{}';