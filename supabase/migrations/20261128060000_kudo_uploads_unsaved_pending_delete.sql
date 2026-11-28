-- Migration 10 — kudo_uploads: an unsaved upload may become pending_delete (F005 A8; Codex R04, N02)
--
-- DELETE /api/v1/uploads/{uploadId} and the manual purge mark the row pending_delete in a short
-- locked transaction, delete the Storage object after commit, then delete the row. When the object
-- delete fails the row stays pending_delete and the purge retries it, so no object is ever left
-- without a row. A pending upload was never attached, so its pending_delete row keeps kudo_id and
-- attached_at null; an attachment removed in an edit keeps both (N02). `pending` stays unattached
-- and `attached` stays attached, exactly as before.

alter table public.kudo_uploads
  drop constraint kudo_uploads_kudo_matches_state,
  drop constraint kudo_uploads_attached_at_matches_state,
  add constraint kudo_uploads_kudo_matches_state check (
    (state = 'pending' and kudo_id is null)
    or (state = 'attached' and kudo_id is not null)
    or state = 'pending_delete'
  ),
  add constraint kudo_uploads_attached_at_matches_state check (
    (state = 'pending' and attached_at is null)
    or (state = 'attached' and attached_at is not null)
    or state = 'pending_delete'
  );
