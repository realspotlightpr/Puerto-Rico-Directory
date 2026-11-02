-- Read-only post-apply reconciliation for manifest 2026-11-01-v1.
WITH scoped AS (
  SELECT * FROM public.businesses
  WHERE slug IN (
    'adorno-bakery-kmzzi',
    'ameila-pizza-s32n5',
    'anawim-catholic-bookstore-5bm3x',
    'arecibo-light-house-s32xq',
    'bargain-city-xbn2h',
    'bermudas-4fefg',
    'cmn-window-tint-1fj59',
    'colegio-pentecostal-arecibo-o3mgf',
    'david-sandwiches-47lry',
    'el-qioskuito-del-norte-7fwav',
    'enmarcados-alamar-iwa13',
    'entremasas-pizza-and-pasta-9h3zd',
    'foresta-cannabis-collection-two16',
    'frozen-ice-lwk3c',
    'gs-contractors-pr-ndo38',
    'gyro-express-hy7to',
    'healthy-body-arecibo',
    'homemade-cookies-pr-51u2h',
    'infinto-lacco',
    'josue-refrigeration-inc-lvu8m',
    'jrc-tax-accounting-fstx0',
    'jungla-grooming-pidob',
    'marullos-cafe-arecibo',
    'miramar-bbq-arecibo',
    'mitchell-interior-contractors-inc-bey1v',
    'multinational-y65nt',
    'natural-nurse-swyeo',
    'ocean-restaurant-8d8ji',
    'offshore-acai-bar-uvi2t',
    'oldach-arecibo-a6vox',
    'olympic-travel-tours-u7iz1',
    'oro-norte-xmtgm',
    'oscar-auto-tint-tzeo3',
    'pina-colada-stand-kdox6',
    'pito-sandwhich-7qowo',
    'sabor-frape-g9f19',
    'simple-coffee-xiwfh',
    'skincare-body-aesthetic-gwto1',
    'smartphone-solutions-and-computer-center-17roi',
    'ta-con-madras-xkq98',
    'tll-auto-shop-vf66h',
    'villafane-modern-tax-accounting-4k4h7',
    'wah-fun-u8a4t',
    'yanya-curls-ivev6'
  )
)
SELECT
  count(*) AS scoped_total,
  count(*) FILTER (WHERE status = 'approved') AS approved_total,
  count(*) FILTER (WHERE status = 'rejected') AS archived_total,
  count(*) FILTER (
    WHERE status = 'approved' AND (
      logo_url IS NULL OR cover_url IS NULL OR
      logo_url LIKE '%placeholder-logo%' OR
      cover_url LIKE '%hero-bg%' OR
      cover_url = 'https://spotlightpuertorico.com/opengraph.jpg'
    )
  ) AS invalid_public_media,
  (SELECT count(*) FROM spotlight_ops.spotlight_business_media_backup_20261101) AS backup_rows,
  (SELECT count(*) FROM spotlight_ops.spotlight_business_media_audit WHERE manifest_version = '2026-11-01-v1' AND action <> 'restore') AS audited_changes
FROM scoped;

-- Expected: scoped_total=44, approved_total=32, archived_total=12,
-- invalid_public_media=0, backup_rows>=44, audited_changes=40.
