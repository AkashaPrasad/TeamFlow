-- ============================================================
-- TeamPost App Feature Sync
-- Run this on an existing database without reset.
-- Safe to rerun.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.info_items
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.info_items DROP CONSTRAINT IF EXISTS info_items_type_check;
ALTER TABLE public.info_items
  ADD CONSTRAINT info_items_type_check CHECK (type IN ('text', 'photo', 'video', 'document', 'api_key', 'number', 'prompt', 'claude_skill'));

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_status_check;
ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_status_check CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'rejected', 'couldnt_do'));

CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS attachment JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.team_messages DROP CONSTRAINT IF EXISTS team_messages_sender_id_fkey;
ALTER TABLE public.team_messages
  ADD CONSTRAINT team_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.team_messages DROP CONSTRAINT IF EXISTS team_messages_content_or_attachment_check;
ALTER TABLE public.team_messages
  ADD CONSTRAINT team_messages_content_or_attachment_check CHECK (content IS NOT NULL OR attachment IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS attachment JSONB,
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_or_attachment_check;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_or_attachment_check CHECK (content IS NOT NULL OR attachment IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tasks_team_project_sort_order ON public.tasks(team_id, project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_info_items_pinned_sort_order ON public.info_items(team_id, pinned DESC, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_team_messages_team_created_at ON public.team_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(team_id, sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON public.direct_messages(team_id, receiver_id, read) WHERE read = false;

CREATE OR REPLACE FUNCTION public.can_access_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND public.is_team_member(t.team_id)
      AND (
        t.visibility = 'team'
        OR t.created_by = auth.uid()
        OR t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.task_assignees ta
          WHERE ta.task_id = t.id
            AND ta.user_id = auth.uid()
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_comment_on_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND public.can_access_task(t.id)
      AND NOT (
        t.created_by <> auth.uid()
        AND (
          (t.status = 'couldnt_do' AND t.assignee_id = auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.task_assignees ta
            WHERE ta.task_id = t.id
              AND ta.user_id = auth.uid()
              AND ta.status = 'couldnt_do'
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.create_task(
  p_team_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_status TEXT DEFAULT 'todo',
  p_visibility TEXT DEFAULT 'team',
  p_due_date DATE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks;
  v_next_sort_order INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_user_in_team(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this team';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Task title required';
  END IF;

  IF p_assignee_id IS NOT NULL AND NOT public.is_user_in_team(p_team_id, p_assignee_id) THEN
    RAISE EXCEPTION 'Assignee must belong to this team';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public.project_matches_team(p_project_id, p_team_id) THEN
    RAISE EXCEPTION 'Project must belong to this team';
  END IF;

  SELECT COALESCE(MAX(t.sort_order), -1) + 1
  INTO v_next_sort_order
  FROM public.tasks t
  WHERE t.team_id = p_team_id
    AND t.project_id IS NOT DISTINCT FROM p_project_id;

  INSERT INTO public.tasks (
    team_id,
    created_by,
    title,
    description,
    assignee_id,
    priority,
    status,
    visibility,
    due_date,
    project_id,
    sort_order
  )
  VALUES (
    p_team_id,
    auth.uid(),
    btrim(p_title),
    p_description,
    p_assignee_id,
    COALESCE(p_priority, 'medium'),
    COALESCE(p_status, 'todo'),
    COALESCE(p_visibility, 'team'),
    p_due_date,
    p_project_id,
    v_next_sort_order
  )
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_task_assignees(
  p_task_id UUID,
  p_user_ids UUID[]
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks;
  v_user_id UUID;
  v_unique_user_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF NOT public.can_modify_task(p_task_id) THEN
    RAISE EXCEPTION 'You cannot modify this task';
  END IF;

  DELETE FROM public.task_assignees WHERE task_id = p_task_id;

  v_unique_user_ids := ARRAY(
    SELECT DISTINCT user_id
    FROM unnest(COALESCE(p_user_ids, '{}'::UUID[])) AS user_id
    WHERE user_id IS NOT NULL
  );

  FOREACH v_user_id IN ARRAY v_unique_user_ids LOOP
    IF public.is_user_in_team(v_task.team_id, v_user_id) THEN
      INSERT INTO public.task_assignees (task_id, user_id, status)
      VALUES (p_task_id, v_user_id, 'todo')
      ON CONFLICT (task_id, user_id) DO UPDATE SET status = EXCLUDED.status;
    END IF;
  END LOOP;

  UPDATE public.tasks
  SET
    assignee_id = CASE WHEN COALESCE(array_length(v_unique_user_ids, 1), 0) = 1 THEN v_unique_user_ids[1] ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_assignee_status(
  p_task_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks;
  v_done_count INTEGER;
  v_total_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF p_status NOT IN ('todo', 'in_progress', 'in_review', 'done', 'rejected', 'couldnt_do') THEN
    RAISE EXCEPTION 'Invalid task status';
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.can_modify_task(p_task_id) THEN
    RAISE EXCEPTION 'You cannot update this assignee';
  END IF;

  UPDATE public.task_assignees
  SET status = p_status
  WHERE task_id = p_task_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO v_total_count, v_done_count
  FROM public.task_assignees
  WHERE task_id = p_task_id;

  IF v_total_count > 0 AND v_done_count = v_total_count THEN
    UPDATE public.tasks SET status = 'in_review', updated_at = NOW() WHERE id = p_task_id;
  ELSE
    UPDATE public.tasks SET updated_at = NOW() WHERE id = p_task_id;
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_tasks(
  p_team_id UUID,
  p_project_id UUID,
  p_task_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_index INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION 'You are not a member of this team';
  END IF;

  FOREACH v_task_id IN ARRAY COALESCE(p_task_ids, '{}'::UUID[]) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = v_task_id
        AND t.team_id = p_team_id
        AND t.project_id IS NOT DISTINCT FROM p_project_id
    ) THEN
      RAISE EXCEPTION 'Invalid task in reorder list';
    END IF;

    UPDATE public.tasks
    SET sort_order = v_index, updated_at = NOW()
    WHERE id = v_task_id;

    v_index := v_index + 1;
  END LOOP;
END;
$$;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members read task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Team members insert task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Team members delete task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Assignees update their status" ON public.task_assignees;

CREATE POLICY "Team members read task assignees" ON public.task_assignees
  FOR SELECT USING (public.can_access_task(task_id));

CREATE POLICY "Team members insert task assignees" ON public.task_assignees
  FOR INSERT WITH CHECK (
    public.can_modify_task(task_id)
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_id
        AND public.is_user_in_team(t.team_id, user_id)
    )
  );

CREATE POLICY "Team members delete task assignees" ON public.task_assignees
  FOR DELETE USING (public.can_modify_task(task_id));

CREATE POLICY "Assignees update their status" ON public.task_assignees
  FOR UPDATE USING (user_id = auth.uid() OR public.can_modify_task(task_id))
  WITH CHECK (user_id = auth.uid() OR public.can_modify_task(task_id));

DROP POLICY IF EXISTS "Team members read team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Team members send team messages" ON public.team_messages;
DROP POLICY IF EXISTS "Senders delete team messages" ON public.team_messages;

CREATE POLICY "Team members read team messages" ON public.team_messages
  FOR SELECT USING (public.is_team_member(team_id));

CREATE POLICY "Team members send team messages" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_team_member(team_id)
  );

CREATE POLICY "Senders delete team messages" ON public.team_messages
  FOR DELETE USING (sender_id = auth.uid() OR public.is_team_admin(team_id));

DROP POLICY IF EXISTS "Users read their direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Team members send direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Receivers update direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders delete direct messages" ON public.direct_messages;

CREATE POLICY "Users read their direct messages" ON public.direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Team members send direct messages" ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = direct_messages.team_id
        AND tm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = direct_messages.team_id
        AND tm.user_id = receiver_id
    )
  );

CREATE POLICY "Receivers update direct messages" ON public.direct_messages
  FOR UPDATE USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "Senders delete direct messages" ON public.direct_messages
  FOR DELETE USING (sender_id = auth.uid() OR public.is_team_admin(team_id));

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END;
$$;
