ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_task_id text,
  ADD COLUMN IF NOT EXISTS google_list_id text;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_google_task_idx
  ON public.tasks (user_id, google_list_id, google_task_id)
  WHERE google_task_id IS NOT NULL;