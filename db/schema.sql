-- ============================================================
-- TeamFlow Master Schema
-- Run this after reset.sql, or rerun it by itself to converge
-- the database safely to the latest schema/policies/triggers.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role_tag TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  platforms TEXT[] DEFAULT '{}'::TEXT[],
  visibility TEXT DEFAULT 'team',
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goals TEXT[] DEFAULT '{}'::TEXT[],
  start_date DATE,
  end_date DATE,
  platforms TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT DEFAULT 'planning',
  visibility TEXT DEFAULT 'team',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  visibility TEXT DEFAULT 'team',
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  ref_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.info_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  note TEXT,
  provider TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'team',
  pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ── Converge Existing Tables ─────────────────────────────────

ALTER TABLE public.team_members
  ALTER COLUMN role SET DEFAULT 'member',
  ALTER COLUMN online SET DEFAULT false,
  ALTER COLUMN last_seen SET DEFAULT NOW(),
  ALTER COLUMN joined_at SET DEFAULT NOW();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.info_items
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE public.team_messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS attachment JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS attachment JSONB,
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.team_messages DROP CONSTRAINT IF EXISTS team_messages_sender_id_fkey;
ALTER TABLE public.team_messages
  ADD CONSTRAINT team_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey;
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check CHECK (role IN ('admin', 'member'));

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('private', 'team'));
ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'pending_review', 'approved', 'posted'));

ALTER TABLE public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_type_check;
ALTER TABLE public.post_reactions
  ADD CONSTRAINT post_reactions_type_check CHECK (type IN ('looks_good', 'suggest_edit'));

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_visibility_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (status IN ('planning', 'active', 'on_hold', 'completed'));
ALTER TABLE public.projects
  ADD CONSTRAINT projects_visibility_check CHECK (visibility IN ('private', 'team'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_visibility_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'rejected', 'couldnt_do'));
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_visibility_check CHECK (visibility IN ('private', 'team'));

ALTER TABLE public.info_items DROP CONSTRAINT IF EXISTS info_items_type_check;
ALTER TABLE public.info_items DROP CONSTRAINT IF EXISTS info_items_visibility_check;
ALTER TABLE public.info_items
  ADD CONSTRAINT info_items_type_check CHECK (type IN ('text', 'photo', 'video', 'document', 'api_key', 'number', 'prompt', 'claude_skill'));
ALTER TABLE public.info_items
  ADD CONSTRAINT info_items_visibility_check CHECK (visibility IN ('private', 'team'));

ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_status_check;
ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_status_check CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'rejected', 'couldnt_do'));

ALTER TABLE public.team_messages DROP CONSTRAINT IF EXISTS team_messages_content_or_attachment_check;
ALTER TABLE public.team_messages
  ADD CONSTRAINT team_messages_content_or_attachment_check CHECK (content IS NOT NULL OR attachment IS NOT NULL);

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_or_attachment_check;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_or_attachment_check CHECK (content IS NOT NULL OR attachment IS NOT NULL);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_team_id ON public.posts(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_project_sort_order ON public.tasks(team_id, project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_created_at ON public.task_comments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_info_items_team_id ON public.info_items(team_id);
CREATE INDEX IF NOT EXISTS idx_info_items_pinned_sort_order ON public.info_items(team_id, pinned DESC, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_team_messages_team_created_at ON public.team_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(team_id, sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON public.direct_messages(team_id, receiver_id, read) WHERE read = false;

-- ── Helper Functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(public.profiles.name, EXCLUDED.name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_team_member(p_team_id)
$$;

CREATE OR REPLACE FUNCTION public.is_user_in_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.project_team_id(p_project_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.team_id
  FROM public.projects p
  WHERE p.id = p_project_id
$$;

CREATE OR REPLACE FUNCTION public.project_matches_team(p_project_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.team_id = p_team_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND public.is_team_member(p.team_id)
      AND (
        p.visibility = 'team'
        OR p.created_by = auth.uid()
        OR public.is_project_member(p.id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = p_post_id
      AND public.is_team_member(p.team_id)
      AND (
        p.visibility = 'team'
        OR p.author_id = auth.uid()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_modify_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = p_post_id
      AND (
        p.author_id = auth.uid()
        OR public.is_team_admin(p.team_id)
      )
  )
$$;

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

CREATE OR REPLACE FUNCTION public.can_modify_task(p_task_id UUID)
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
      AND (
        t.created_by = auth.uid()
        OR t.assignee_id = auth.uid()
        OR public.is_team_admin(t.team_id)
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

  SELECT *
  INTO v_task
  FROM public.tasks
  WHERE id = p_task_id;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF NOT public.can_modify_task(p_task_id) THEN
    RAISE EXCEPTION 'You cannot modify this task';
  END IF;

  DELETE FROM public.task_assignees
  WHERE task_id = p_task_id;

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

  SELECT *
  INTO v_task
  FROM public.tasks
  WHERE id = p_task_id;

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
    UPDATE public.tasks
    SET status = 'in_review', updated_at = NOW()
    WHERE id = p_task_id;
  ELSE
    UPDATE public.tasks
    SET updated_at = NOW()
    WHERE id = p_task_id;
  END IF;

  SELECT *
  INTO v_task
  FROM public.tasks
  WHERE id = p_task_id;

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

CREATE OR REPLACE FUNCTION public.create_task_comment(
  p_task_id UUID,
  p_content TEXT
)
RETURNS public.task_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment public.task_comments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'Comment required';
  END IF;

  IF NOT public.can_access_task(p_task_id) THEN
    RAISE EXCEPTION 'You cannot access this task';
  END IF;

  IF NOT public.can_comment_on_task(p_task_id) THEN
    RAISE EXCEPTION 'This ticket is locked for you until the creator reopens or reassigns it';
  END IF;

  INSERT INTO public.task_comments (
    task_id,
    author_id,
    content
  )
  VALUES (
    p_task_id,
    auth.uid(),
    btrim(p_content)
  )
  RETURNING * INTO v_comment;

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project(
  p_team_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_goals TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_platforms TEXT[] DEFAULT NULL,
  p_status TEXT DEFAULT 'planning',
  p_visibility TEXT DEFAULT 'team',
  p_notes TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects;
  v_member_id UUID;
  v_member_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_user_in_team(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this team';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Project name required';
  END IF;

  INSERT INTO public.projects (
    team_id,
    created_by,
    name,
    description,
    goals,
    start_date,
    end_date,
    platforms,
    status,
    visibility,
    notes
  )
  VALUES (
    p_team_id,
    auth.uid(),
    btrim(p_name),
    p_description,
    COALESCE(p_goals, '{}'::TEXT[]),
    p_start_date,
    p_end_date,
    COALESCE(p_platforms, '{}'::TEXT[]),
    COALESCE(p_status, 'planning'),
    COALESCE(p_visibility, 'team'),
    p_notes
  )
  RETURNING * INTO v_project;

  v_member_ids := array_remove(COALESCE(p_member_ids, '{}'::UUID[]) || auth.uid(), NULL);

  FOREACH v_member_id IN ARRAY v_member_ids LOOP
    IF public.is_user_in_team(p_team_id, v_member_id) THEN
      INSERT INTO public.project_members (project_id, user_id)
      VALUES (v_project.id, v_member_id)
      ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project(
  p_project_id UUID,
  p_team_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_goals TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_platforms TEXT[] DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_visibility TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects;
  v_member_id UUID;
  v_member_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
    AND team_id = p_team_id;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF NOT public.is_user_in_team(p_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this team';
  END IF;

  UPDATE public.projects
  SET
    name = COALESCE(NULLIF(btrim(p_name), ''), name),
    description = p_description,
    goals = COALESCE(p_goals, goals),
    start_date = p_start_date,
    end_date = p_end_date,
    platforms = COALESCE(p_platforms, platforms),
    status = COALESCE(p_status, status),
    visibility = COALESCE(p_visibility, visibility),
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_project_id
  RETURNING * INTO v_project;

  IF p_member_ids IS NOT NULL THEN
    DELETE FROM public.project_members
    WHERE project_id = p_project_id;

    v_member_ids := array_remove(p_member_ids || auth.uid(), NULL);

    FOREACH v_member_id IN ARRAY v_member_ids LOOP
      IF public.is_user_in_team(p_team_id, v_member_id) THEN
        INSERT INTO public.project_members (project_id, user_id)
        VALUES (p_project_id, v_member_id)
        ON CONFLICT (project_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_project;
END;
$$;

-- ── Triggers ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_info_items_updated_at ON public.info_items;
CREATE TRIGGER set_info_items_updated_at
  BEFORE UPDATE ON public.info_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;

CREATE POLICY "Public profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Teams
DROP POLICY IF EXISTS "Authenticated users read teams" ON public.teams;
DROP POLICY IF EXISTS "Users create teams" ON public.teams;
DROP POLICY IF EXISTS "Admins update teams" ON public.teams;
DROP POLICY IF EXISTS "Admins delete teams" ON public.teams;

CREATE POLICY "Authenticated users read teams" ON public.teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins update teams" ON public.teams
  FOR UPDATE USING (public.is_team_admin(id) OR created_by = auth.uid())
  WITH CHECK (public.is_team_admin(id) OR created_by = auth.uid());

CREATE POLICY "Admins delete teams" ON public.teams
  FOR DELETE USING (public.is_team_admin(id) OR created_by = auth.uid());

-- Team members
DROP POLICY IF EXISTS "Team members can see teammates" ON public.team_members;
DROP POLICY IF EXISTS "Users join as themselves" ON public.team_members;
DROP POLICY IF EXISTS "Admins update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Admins or self remove members" ON public.team_members;

CREATE POLICY "Team members can see teammates" ON public.team_members
  FOR SELECT USING (team_id = ANY (SELECT public.get_my_team_ids()));

CREATE POLICY "Users join as themselves" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id)
  );

CREATE POLICY "Admins update member roles" ON public.team_members
  FOR UPDATE USING (public.is_team_admin(team_id))
  WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Admins or self remove members" ON public.team_members
  FOR DELETE USING (user_id = auth.uid() OR public.is_team_admin(team_id));

-- Posts
DROP POLICY IF EXISTS "Team members read visible posts" ON public.posts;
DROP POLICY IF EXISTS "Team members create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors and admins update posts" ON public.posts;
DROP POLICY IF EXISTS "Authors and admins delete posts" ON public.posts;

CREATE POLICY "Team members read visible posts" ON public.posts
  FOR SELECT USING (public.can_access_post(id));

CREATE POLICY "Team members create posts" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND public.is_team_member(team_id)
  );

CREATE POLICY "Authors and admins update posts" ON public.posts
  FOR UPDATE USING (public.can_modify_post(id))
  WITH CHECK (public.can_modify_post(id));

CREATE POLICY "Authors and admins delete posts" ON public.posts
  FOR DELETE USING (public.can_modify_post(id));

-- Post images
DROP POLICY IF EXISTS "Team members read post images" ON public.post_images;
DROP POLICY IF EXISTS "Post authors insert images" ON public.post_images;
DROP POLICY IF EXISTS "Post authors delete images" ON public.post_images;

CREATE POLICY "Team members read post images" ON public.post_images
  FOR SELECT USING (public.can_access_post(post_id));

CREATE POLICY "Post authors insert images" ON public.post_images
  FOR INSERT WITH CHECK (public.can_modify_post(post_id));

CREATE POLICY "Post authors delete images" ON public.post_images
  FOR DELETE USING (public.can_modify_post(post_id));

-- Post reactions
DROP POLICY IF EXISTS "Team members read reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Team members add reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users remove own reactions" ON public.post_reactions;

CREATE POLICY "Team members read reactions" ON public.post_reactions
  FOR SELECT USING (public.can_access_post(post_id));

CREATE POLICY "Team members add reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_post(post_id)
  );

CREATE POLICY "Users remove own reactions" ON public.post_reactions
  FOR DELETE USING (user_id = auth.uid() OR public.can_modify_post(post_id));

-- Comments
DROP POLICY IF EXISTS "Team members read comments" ON public.comments;
DROP POLICY IF EXISTS "Team members add comments" ON public.comments;
DROP POLICY IF EXISTS "Authors delete own comments" ON public.comments;

CREATE POLICY "Team members read comments" ON public.comments
  FOR SELECT USING (public.can_access_post(post_id));

CREATE POLICY "Team members add comments" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND public.can_access_post(post_id)
  );

CREATE POLICY "Authors delete own comments" ON public.comments
  FOR DELETE USING (author_id = auth.uid() OR public.can_modify_post(post_id));

-- Projects
DROP POLICY IF EXISTS "Team members read projects" ON public.projects;
DROP POLICY IF EXISTS "Team members create projects" ON public.projects;
DROP POLICY IF EXISTS "Team members update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;

CREATE POLICY "Team members read projects" ON public.projects
  FOR SELECT USING (public.can_access_project(id));

CREATE POLICY "Team members create projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_team_member(team_id)
  );

CREATE POLICY "Team members update projects" ON public.projects
  FOR UPDATE USING (public.is_team_member(team_id))
  WITH CHECK (public.is_team_member(team_id));

CREATE POLICY "Admins delete projects" ON public.projects
  FOR DELETE USING (public.is_team_admin(team_id));

-- Project members
DROP POLICY IF EXISTS "Team members read project members" ON public.project_members;
DROP POLICY IF EXISTS "Team members insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Team members delete project members" ON public.project_members;
DROP POLICY IF EXISTS "Team members manage project members" ON public.project_members;

CREATE POLICY "Team members read project members" ON public.project_members
  FOR SELECT USING (public.can_access_project(project_id));

CREATE POLICY "Team members insert project members" ON public.project_members
  FOR INSERT WITH CHECK (
    public.is_team_member(public.project_team_id(project_id))
    AND public.is_user_in_team(public.project_team_id(project_id), user_id)
  );

CREATE POLICY "Team members delete project members" ON public.project_members
  FOR DELETE USING (public.is_team_member(public.project_team_id(project_id)));

-- Tasks
DROP POLICY IF EXISTS "Team members read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members delete tasks" ON public.tasks;

CREATE POLICY "Team members read tasks" ON public.tasks
  FOR SELECT USING (public.can_access_task(id));

CREATE POLICY "Team members create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND team_id = ANY (SELECT public.get_my_team_ids())
  );

CREATE POLICY "Team members update tasks" ON public.tasks
  FOR UPDATE USING (public.can_modify_task(id))
  WITH CHECK (
    team_id = ANY (SELECT public.get_my_team_ids())
  );

CREATE POLICY "Team members delete tasks" ON public.tasks
  FOR DELETE USING (public.can_modify_task(id));

-- Task comments
DROP POLICY IF EXISTS "Team members read task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Team members add task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Authors delete own task comments" ON public.task_comments;

CREATE POLICY "Team members read task comments" ON public.task_comments
  FOR SELECT USING (public.can_access_task(task_id));

CREATE POLICY "Team members add task comments" ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND public.can_comment_on_task(task_id)
  );

CREATE POLICY "Authors delete own task comments" ON public.task_comments
  FOR DELETE USING (author_id = auth.uid() OR public.can_modify_task(task_id));

-- Task assignees
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
  WITH CHECK (
    user_id = auth.uid() OR public.can_modify_task(task_id)
  );

-- Task activity
DROP POLICY IF EXISTS "Team members read task activity" ON public.task_activity;
DROP POLICY IF EXISTS "Team members log task activity" ON public.task_activity;

CREATE POLICY "Team members read task activity" ON public.task_activity
  FOR SELECT USING (public.can_access_task(task_id));

CREATE POLICY "Team members log task activity" ON public.task_activity
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_task(task_id)
  );

-- Notifications
DROP POLICY IF EXISTS "Own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Info items
DROP POLICY IF EXISTS "Read info items" ON public.info_items;
DROP POLICY IF EXISTS "Create info items" ON public.info_items;
DROP POLICY IF EXISTS "Update info items" ON public.info_items;
DROP POLICY IF EXISTS "Delete info items" ON public.info_items;

CREATE POLICY "Read info items" ON public.info_items
  FOR SELECT USING (
    public.is_team_member(team_id)
    AND (
      visibility = 'team'
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Create info items" ON public.info_items
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_team_member(team_id)
    AND (task_id IS NULL OR public.can_access_task(task_id))
  );

CREATE POLICY "Update info items" ON public.info_items
  FOR UPDATE USING (created_by = auth.uid() OR public.is_team_admin(team_id))
  WITH CHECK (
    public.is_team_member(team_id)
    AND (task_id IS NULL OR public.can_access_task(task_id))
  );

CREATE POLICY "Delete info items" ON public.info_items
  FOR DELETE USING (created_by = auth.uid() OR public.is_team_admin(team_id));

-- Team messages
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

-- Direct messages
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
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = direct_messages.team_id
        AND tm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.team_members tm
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
