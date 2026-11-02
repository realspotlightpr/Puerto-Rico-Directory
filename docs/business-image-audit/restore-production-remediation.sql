-- Reverses only the status/logo/cover changes made by 2026-11-01-v1.
-- Full business records and relationships were never deleted.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('spotlight-business-image-remediation-2026-11-01'));

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) < 44 THEN
    RAISE EXCEPTION 'Cannot restore: complete 44-row backup is missing';
  END IF;
END $$;

INSERT INTO spotlight_ops.spotlight_business_media_audit
  (business_id, slug, action, reason, before_state, after_state, manifest_version)
SELECT
  b.id,
  b.slug,
  'restore',
  'Operator-requested rollback to pre-remediation status and media URLs.',
  jsonb_build_object('status', b.status, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'updated_at', b.updated_at),
  jsonb_build_object(
    'status', backup.record_snapshot->>'status',
    'logo_url', backup.record_snapshot->'logo_url',
    'cover_url', backup.record_snapshot->'cover_url',
    'updated_at', backup.record_snapshot->>'updated_at'
  ),
  '2026-11-01-v1'
FROM public.businesses b
JOIN spotlight_ops.spotlight_business_media_backup_20261101 backup ON backup.business_id = b.id;

UPDATE public.businesses b
SET
  status = (backup.record_snapshot->>'status')::public.business_status,
  logo_url = backup.record_snapshot->>'logo_url',
  cover_url = backup.record_snapshot->>'cover_url',
  updated_at = (backup.record_snapshot->>'updated_at')::timestamp
FROM spotlight_ops.spotlight_business_media_backup_20261101 backup
WHERE backup.business_id = b.id;

COMMIT;
