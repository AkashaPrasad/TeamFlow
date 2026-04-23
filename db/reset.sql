-- ============================================================
-- TeamFlow Reset
-- Run this first only when you want a clean wipe.
-- WARNING: This drops all TeamFlow data, tables, triggers, and helpers.
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.info_items CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.team_messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.task_activity CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
DROP TABLE IF EXISTS public.task_assignees CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.post_images CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.get_my_team_ids();
DROP FUNCTION IF EXISTS public.is_team_member(UUID);
DROP FUNCTION IF EXISTS public.is_team_admin(UUID);
DROP FUNCTION IF EXISTS public.is_user_in_team(UUID, UUID);
DROP FUNCTION IF EXISTS public.project_team_id(UUID);
DROP FUNCTION IF EXISTS public.is_project_member(UUID);
DROP FUNCTION IF EXISTS public.project_matches_team(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_access_project(UUID);
DROP FUNCTION IF EXISTS public.can_access_post(UUID);
DROP FUNCTION IF EXISTS public.can_modify_post(UUID);
DROP FUNCTION IF EXISTS public.can_access_task(UUID);
DROP FUNCTION IF EXISTS public.can_modify_task(UUID);
DROP FUNCTION IF EXISTS public.can_comment_on_task(UUID);
DROP FUNCTION IF EXISTS public.create_task(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, DATE, UUID);
DROP FUNCTION IF EXISTS public.create_task_comment(UUID, TEXT);
DROP FUNCTION IF EXISTS public.set_task_assignees(UUID, UUID[]);
DROP FUNCTION IF EXISTS public.update_task_assignee_status(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reorder_tasks(UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.create_project(UUID, TEXT, TEXT, TEXT[], DATE, DATE, TEXT[], TEXT, TEXT, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.update_project(UUID, UUID, TEXT, TEXT, TEXT[], DATE, DATE, TEXT[], TEXT, TEXT, TEXT, UUID[]);
