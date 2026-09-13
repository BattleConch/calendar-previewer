CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  date date NOT NULL,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '10:00',
  tag text NOT NULL DEFAULT 'blue',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false,
  due date,
  tag text,
  priority text NOT NULL DEFAULT 'med',
  notes text,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  tag text,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER notes_touch BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

CREATE INDEX events_user_date_idx ON public.events (user_id, date);
CREATE INDEX tasks_user_idx ON public.tasks (user_id, position);
CREATE INDEX notes_user_idx ON public.notes (user_id, position);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminders text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminders text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.tags (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  label text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'blue',
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tags" ON public.tags
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tags_touch BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;

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

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_task_id text,
  ADD COLUMN IF NOT EXISTS google_list_id text;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_google_task_idx
  ON public.tasks (user_id, google_list_id, google_task_id)
  WHERE google_task_id IS NOT NULL;