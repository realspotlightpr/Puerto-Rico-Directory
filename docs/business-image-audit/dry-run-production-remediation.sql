-- Generated from business-image-manifest.json. Review and deploy the referenced static assets first.
-- Run only with authorized production database access.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('spotlight-business-image-remediation-2026-11-01'));

CREATE SCHEMA IF NOT EXISTS spotlight_ops;
REVOKE ALL ON SCHEMA spotlight_ops FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA spotlight_ops TO service_role;

CREATE TABLE IF NOT EXISTS spotlight_ops.spotlight_business_media_backup_20261101 (
  business_id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  record_snapshot jsonb NOT NULL,
  related_counts jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spotlight_ops.spotlight_business_media_audit (
  id bigserial PRIMARY KEY,
  business_id integer NOT NULL,
  slug text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  manifest_version text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES IN SCHEMA spotlight_ops FROM public, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA spotlight_ops TO service_role;

CREATE TEMP TABLE spotlight_business_media_plan (
  slug text PRIMARY KEY,
  business_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('keep', 'update_logo', 'update_both', 'archive')),
  target_status text NOT NULL CHECK (target_status IN ('approved', 'rejected')),
  target_logo_url text,
  target_cover_url text,
  reason text NOT NULL
) ON COMMIT DROP;

INSERT INTO spotlight_business_media_plan
  (slug, business_name, action, target_status, target_logo_url, target_cover_url, reason)
VALUES
  ('adorno-bakery-kmzzi', 'Adorno Bakery', 'archive', 'rejected', NULL, NULL, 'No safely reusable, business-specific logo and cover pair was verified.'),
  ('ameila-pizza-s32n5', 'Ameila Pizza', 'keep', 'approved', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/7967510a-a56f-4e51-99f0-fd19eb2c0c57/1788132969353-exxcaj.jpg', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/109/cover.jpg', 'Existing logo and cover are business-specific, reachable, visually verified, and dimensionally acceptable.'),
  ('anawim-catholic-bookstore-5bm3x', 'Anawim Catholic Bookstore', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/anawim-catholic-bookstore-5bm3x/logo.webp', 'https://spotlightpuertorico.com/images/businesses/anawim-catholic-bookstore-5bm3x/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.'),
  ('arecibo-light-house-s32xq', 'Arecibo Light House', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/arecibo-light-house-s32xq/logo.webp', 'https://spotlightpuertorico.com/images/businesses/arecibo-light-house-s32xq/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.'),
  ('bargain-city-xbn2h', 'Bargain City', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/bargain-city-xbn2h/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/95/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('bermudas-4fefg', 'Bermudas', 'archive', 'rejected', NULL, NULL, 'A logo was found, but no safely usable business-specific cover could be verified.'),
  ('cmn-window-tint-1fj59', 'CMN Window Tint', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/cmn-window-tint-1fj59/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/94/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('colegio-pentecostal-arecibo-o3mgf', 'Colegio Pentecostal Arecibo', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/colegio-pentecostal-arecibo-o3mgf/logo.webp', 'https://spotlightpuertorico.com/images/businesses/colegio-pentecostal-arecibo-o3mgf/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.'),
  ('david-sandwiches-47lry', 'David Sandwiches', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/david-sandwiches-47lry/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/103/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('el-qioskuito-del-norte-7fwav', 'El qioskuito del norte', 'archive', 'rejected', NULL, NULL, 'No authoritative public media source could be matched with sufficient confidence.'),
  ('enmarcados-alamar-iwa13', 'Enmarcados Alamar', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/enmarcados-alamar-iwa13/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/105/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('entremasas-pizza-and-pasta-9h3zd', 'Entremasas pizza and pasta', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/entremasas-pizza-and-pasta-9h3zd/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/106/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('foresta-cannabis-collection-two16', 'Foresta Cannabis Collection', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/foresta-cannabis-collection-two16/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/97/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('frozen-ice-lwk3c', 'Frozen Ice', 'archive', 'rejected', NULL, NULL, 'The listing is too ambiguous to match to public media without risking the wrong business.'),
  ('gs-contractors-pr-ndo38', 'GS Contractors LLC', 'archive', 'rejected', 'https://gscontractorspr.com/wp-content/uploads/2025/09/thumbnail_LOGO-GS-Contractors-LLC-ORIGINAL-e1757544850925-160x105.png', 'https://gscontractorspr.com/wp-content/uploads/2026/03/PHOTO-2026-03-03-06-35-02-1024x670.jpg', 'Both current remote media URLs fail DNS/availability validation.'),
  ('gyro-express-hy7to', 'Gyro Express', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/gyro-express-hy7to/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/98/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('healthy-body-arecibo', 'Healthy Body For Life', 'keep', 'approved', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-logos/2/logo-1024.png', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/2/cover.jpg', 'Existing logo and cover are business-specific, reachable, visually verified, and dimensionally acceptable.'),
  ('homemade-cookies-pr-51u2h', 'Homemade Cookies PR', 'archive', 'rejected', NULL, NULL, 'The listing is too ambiguous to match to public media without risking the wrong business.'),
  ('infinto-lacco', 'Infinto', 'archive', 'rejected', NULL, NULL, 'The business name/identity could not be verified; attaching imagery would risk a false match.'),
  ('josue-refrigeration-inc-lvu8m', 'Josue Refrigeration INC.', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/josue-refrigeration-inc-lvu8m/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/86/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('jrc-tax-accounting-fstx0', 'JRC Tax & Accounting', 'archive', 'rejected', NULL, NULL, 'A real logo exists, but available cover candidates were promotional stock-style graphics rather than real business imagery.'),
  ('jungla-grooming-pidob', 'Jungla Grooming', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/jungla-grooming-pidob/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/81/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('marullos-cafe-arecibo', 'Marullo''s Café', 'keep', 'approved', 'https://raw.githubusercontent.com/realspotlightpr/Puerto-Rico-Directory/master/artifacts/spotlight-pr/public/images/businesses/marullos-cafe/logo.webp', 'https://raw.githubusercontent.com/realspotlightpr/Puerto-Rico-Directory/master/artifacts/spotlight-pr/public/images/businesses/marullos-cafe/truck.webp', 'Existing logo and cover are business-specific, reachable, visually verified, and dimensionally acceptable.'),
  ('miramar-bbq-arecibo', 'Miramar B.B.Q', 'keep', 'approved', 'https://raw.githubusercontent.com/realspotlightpr/Puerto-Rico-Directory/master/artifacts/spotlight-pr/public/images/businesses/miramar-bbq/logo-icon.webp', 'https://raw.githubusercontent.com/realspotlightpr/Puerto-Rico-Directory/master/artifacts/spotlight-pr/public/images/businesses/miramar-bbq/storefront.webp', 'Existing logo and cover are business-specific, reachable, visually verified, and dimensionally acceptable.'),
  ('mitchell-interior-contractors-inc-bey1v', 'Mitchell Interior Contractors Inc.', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/mitchell-interior-contractors-inc-bey1v/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/16/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('multinational-y65nt', 'Multinational', 'archive', 'rejected', NULL, NULL, 'A real logo exists, but the available official cover candidate was generic stock imagery.'),
  ('natural-nurse-swyeo', 'Natural Nurse', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/natural-nurse-swyeo/logo.webp', 'https://spotlightpuertorico.com/images/businesses/natural-nurse-swyeo/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.'),
  ('ocean-restaurant-8d8ji', 'Ocean restaurant', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/ocean-restaurant-8d8ji/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/72/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('offshore-acai-bar-uvi2t', 'Offshore açaí bar', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/offshore-acai-bar-uvi2t/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/78/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('oldach-arecibo-a6vox', 'Oldach - Arecibo', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/oldach-arecibo-a6vox/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/85/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('olympic-travel-tours-u7iz1', 'Olympic Travel & Tours', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/olympic-travel-tours-u7iz1/logo-fallback.webp', 'https://spotlightpuertorico.com/images/businesses/olympic-travel-tours-u7iz1/cover.webp', 'The current business-specific source was visually verified; square and 1600x900 WebP derivatives were prepared to meet display-size requirements.'),
  ('oro-norte-xmtgm', 'Oro Norte', 'archive', 'rejected', NULL, NULL, 'The business identity was verified, but no safely reusable logo and real cover pair was found.'),
  ('oscar-auto-tint-tzeo3', 'Oscar Auto Tint', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/oscar-auto-tint-tzeo3/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/84/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('pina-colada-stand-kdox6', 'Pina Colada Stand', 'archive', 'rejected', NULL, NULL, 'The generic name has multiple possible matches and no authoritative media source.'),
  ('pito-sandwhich-7qowo', 'Pito Sandwhich', 'archive', 'rejected', NULL, NULL, 'No authoritative public media source could be matched with sufficient confidence.'),
  ('sabor-frape-g9f19', 'Sabor Frape', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/sabor-frape-g9f19/logo.webp', 'https://spotlightpuertorico.com/images/businesses/sabor-frape-g9f19/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.'),
  ('simple-coffee-xiwfh', 'Simple. Coffee', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/simple-coffee-xiwfh/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/71/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('skincare-body-aesthetic-gwto1', 'Skincare Body Aesthetic', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/skincare-body-aesthetic-gwto1/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/91/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('smartphone-solutions-and-computer-center-17roi', 'Smartphone Solutions And Computer Center', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/smartphone-solutions-and-computer-center-17roi/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/104/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('ta-con-madras-xkq98', 'Ta con madras', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/ta-con-madras-xkq98/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/80/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('tll-auto-shop-vf66h', 'TLL Auto Shop', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/tll-auto-shop-vf66h/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/83/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('villafane-modern-tax-accounting-4k4h7', 'Villafane Modern Tax & Accounting', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/villafane-modern-tax-accounting-4k4h7/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/89/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('wah-fun-u8a4t', 'Wah Fun', 'update_logo', 'approved', 'https://spotlightpuertorico.com/images/businesses/wah-fun-u8a4t/logo-fallback.webp', 'https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/business-photos/96/cover.jpg', 'The current cover is a visually verified business-specific image; a 512px square WebP fallback was derived from that owned listing image.'),
  ('yanya-curls-ivev6', 'Yanya Curls', 'update_both', 'approved', 'https://spotlightpuertorico.com/images/businesses/yanya-curls-ivev6/logo.webp', 'https://spotlightpuertorico.com/images/businesses/yanya-curls-ivev6/cover.webp', 'Verified public, business-specific media pair prepared and visually reviewed.');

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_business_media_plan) <> 44 THEN
    RAISE EXCEPTION 'Expected 44 manifest rows';
  END IF;
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug)) <> 44 THEN
    RAISE EXCEPTION 'Production businesses do not exactly match the 44-row manifest';
  END IF;
  IF EXISTS (
    SELECT 1 FROM spotlight_ops.spotlight_business_media_audit
    WHERE manifest_version = '2026-11-01-v1' AND action <> 'restore'
  ) THEN
    RAISE EXCEPTION 'Manifest 2026-11-01-v1 has already been applied';
  END IF;
END $$;

-- Full-record backup occurs before any status or media mutation. Relationships remain in place
-- because archived rows are never deleted.
INSERT INTO spotlight_ops.spotlight_business_media_backup_20261101
  (business_id, slug, record_snapshot, related_counts)
SELECT
  b.id,
  b.slug,
  to_jsonb(b),
  jsonb_build_object(
    'reviews', (SELECT count(*) FROM public.reviews r WHERE r.business_id = b.id),
    'media_items', (SELECT count(*) FROM public.media_items m WHERE m.business_id = b.id),
    'menu_items', (SELECT count(*) FROM public.menu_items m WHERE m.business_id = b.id),
    'form_submissions', (SELECT count(*) FROM public.form_submissions f WHERE f.business_id = b.id)
  )
FROM public.businesses b
JOIN spotlight_business_media_plan p USING (slug)
ON CONFLICT (business_id) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) < 44 THEN
    RAISE EXCEPTION 'Backup table does not contain all 44 scoped records';
  END IF;
END $$;

INSERT INTO spotlight_ops.spotlight_business_media_audit
  (business_id, slug, action, reason, before_state, after_state, manifest_version)
SELECT
  b.id,
  b.slug,
  p.action,
  p.reason,
  jsonb_build_object('status', b.status, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'updated_at', b.updated_at),
  jsonb_build_object(
    'status', p.target_status,
    'logo_url', CASE WHEN p.action IN ('update_logo', 'update_both') THEN p.target_logo_url ELSE b.logo_url END,
    'cover_url', CASE WHEN p.action = 'update_both' THEN p.target_cover_url ELSE b.cover_url END
  ),
  '2026-11-01-v1'
FROM public.businesses b
JOIN spotlight_business_media_plan p USING (slug)
WHERE p.action <> 'keep';

UPDATE public.businesses b
SET
  status = p.target_status::public.business_status,
  logo_url = CASE WHEN p.action IN ('update_logo', 'update_both') THEN p.target_logo_url ELSE b.logo_url END,
  cover_url = CASE WHEN p.action = 'update_both' THEN p.target_cover_url ELSE b.cover_url END,
  updated_at = now()
FROM spotlight_business_media_plan p
WHERE b.slug = p.slug AND p.action <> 'keep';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug) WHERE b.status = 'approved') <> 32 THEN
    RAISE EXCEPTION 'Expected exactly 32 approved scoped businesses after remediation';
  END IF;
  IF (SELECT count(*) FROM public.businesses b JOIN spotlight_business_media_plan p USING (slug) WHERE b.status = 'rejected') <> 12 THEN
    RAISE EXCEPTION 'Expected exactly 12 reversibly archived scoped businesses';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    JOIN spotlight_business_media_plan p USING (slug)
    WHERE b.status = 'approved'
      AND (
        b.logo_url IS NULL OR b.cover_url IS NULL OR
        b.logo_url LIKE '%placeholder-logo%' OR
        b.cover_url LIKE '%hero-bg%' OR
        b.cover_url = 'https://spotlightpuertorico.com/opengraph.jpg'
      )
  ) THEN
    RAISE EXCEPTION 'An approved scoped business still has missing or generic media';
  END IF;
END $$;

-- Dry run: all backup, update, archive, audit, and reconciliation statements succeeded.
ROLLBACK;
