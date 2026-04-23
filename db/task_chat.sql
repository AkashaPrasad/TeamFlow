-- ============================================================
-- TeamFlow Task Chat Patch
-- Run this on an existing TeamFlow database to enable
-- task chat safely without resetting anything.
-- Idempotent: safe to rerun.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_created_at ON public.task_comments(task_id, created_at DESC);

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
        t.status = 'couldnt_do'
        AND t.assignee_id = auth.uid()
        AND t.created_by <> auth.uid()
      )
  )
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

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

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
