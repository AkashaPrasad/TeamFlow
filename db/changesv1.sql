-- ─── 1. Info Items: add pin + sort_order ─────────────────────────────────────
ALTER TABLE info_items
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_info_items_pinned ON info_items (team_id, pinned DESC, sort_order ASC);


-- ─── 2. Team Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT,
  attachment  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_or_attachment CHECK (content IS NOT NULL OR attachment IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages (team_id, created_at DESC);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team members can read team messages"
  ON team_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_messages.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "team members can insert team messages"
  ON team_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_messages.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "sender can delete own team messages"
  ON team_messages FOR DELETE
  USING (sender_id = auth.uid());


-- ─── 3. Direct Messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT,
  attachment   JSONB,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_or_attachment CHECK (content IS NOT NULL OR attachment IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
  ON direct_messages (team_id, sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
  ON direct_messages (team_id, receiver_id, read) WHERE read = FALSE;

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read their own DMs"
  ON direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "team members can send DMs"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = direct_messages.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "users can update read status on received DMs"
  ON direct_messages FOR UPDATE
  USING (receiver_id = auth.uid());

CREATE POLICY "sender can delete own DMs"
  ON direct_messages FOR DELETE
  USING (sender_id = auth.uid());


-- ─── 4. Enable Realtime for new tables ───────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication → supabase_realtime publication
-- Or run this SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
