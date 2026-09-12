CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_user_connections_touch BEFORE UPDATE ON public.app_user_connections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS organizer_name text,
  ADD COLUMN IF NOT EXISTS organizer_email text,
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS events_user_google_event_idx
  ON public.events (user_id, google_calendar_id, google_event_id)
  WHERE google_event_id IS NOT NULL;