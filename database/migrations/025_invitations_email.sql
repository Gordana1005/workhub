-- 025: e-mail invitations
-- Idempotent. The app keeps working without this migration (the personal message is simply not
-- stored and the resend cooldown / rate-limit stamp is skipped), but apply it to get the full flow.

-- Columns from 017 (no-ops when already applied)
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Personal note the inviter typed (shown in the invite e-mail template as {{ .Data.invite_message }})
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS message text;

-- When the invite e-mail was last sent: powers the 60s resend cooldown and the 20/hour workspace cap
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS last_sent_at timestamp with time zone;

UPDATE invitations SET status = 'pending' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_message_length'
  ) THEN
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_message_length
      CHECK (message IS NULL OR char_length(message) <= 500);
  END IF;
END $$;

-- Rate-limit lookups: "invitations created / sent for this workspace in the last hour"
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_created
  ON invitations (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_last_sent
  ON invitations (workspace_id, last_sent_at DESC);
