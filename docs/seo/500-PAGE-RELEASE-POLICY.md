# 500-page SEO release policy

This roadmap targets 500 distinct English/Spanish keyword intents across Puerto Rico's 78 municipalities. It is a production backlog, not permission to publish empty URL combinations.

## Release gate

A page may be generated, indexed, and added to an XML sitemap only when its documented requirement in `500-page-roadmap.csv` is satisfied by current first-party inventory or reviewed editorial data. A released page must also have:

- a unique title, description, canonical URL, H1, and useful introduction;
- real local entities or attractions, not a city-name substitution;
- an ItemList or other truthful schema supported by visible content;
- breadcrumbs plus inbound links from a municipality or topical hub;
- contact, access, booking, or planning details that help the searcher act;
- English and Spanish search language handled naturally without duplicated pages;
- no unsupported “best,” “near me,” open-now, price, review, or verification claims.

Pages that fail the gate remain `do_not_generate`; they are not published, linked, or submitted to Google. This protects the domain from doorway-page and scaled-content risk.

## Current release

The live generator reads approved Supabase inventory at build time. It currently releases seven Arecibo category pages with at least two matching approved businesses, plus the individual approved business pages. The broader roadmap expands automatically only as usable local evidence is added.

## Measurement

Track published, submitted, discovered, indexed, ranking, and converting URLs separately. “Published” never means “ranked,” and no page is described as ranked until Search Console records impressions for that URL.
