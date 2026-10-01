-- 005_new_import_format.sql
--
-- The auction-invoice sheet is replaced by the store's own 18-column sheet:
-- sku, title, description, condition, cost, estimated retail, price, link,
-- thumbnail link, date bought, company, location bought, auction date,
-- category, subcategory, tags, season, quantity.
--
-- Note `cost` and `price` are now DIFFERENT things (what we paid vs what we
-- ask). Before this migration the parser mapped the header `price` onto `cost`.
--
-- qty_good / qty_broken / qty_sold are retired in favour of `quantity`. The
-- columns are deliberately NOT dropped — the rows keep whatever was counted.
-- qty_sold stays NOT NULL DEFAULT 0 because the upload no longer sends it; drop
-- that default and every upload fails.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS condition        text,
  ADD COLUMN IF NOT EXISTS estimated_retail numeric,
  ADD COLUMN IF NOT EXISTS price            numeric,
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS season           text,
  ADD COLUMN IF NOT EXISTS quantity         integer,
  -- NOT NULL DEFAULT '{}' is a metadata-only default on PG11+, so no table
  -- rewrite. It also keeps the TypeScript side as string[] rather than
  -- string[] | null, which would need a guard at every read.
  ADD COLUMN IF NOT EXISTS subcategory      text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags             text[] NOT NULL DEFAULT '{}'::text[];

-- New columns only, so these validate instantly.
ALTER TABLE items
  DROP CONSTRAINT IF EXISTS items_quantity_nonneg,
  DROP CONSTRAINT IF EXISTS items_price_nonneg,
  DROP CONSTRAINT IF EXISTS items_estimated_retail_nonneg,
  ADD CONSTRAINT items_quantity_nonneg
    CHECK (quantity IS NULL OR quantity >= 0),
  ADD CONSTRAINT items_price_nonneg
    CHECK (price IS NULL OR price >= 0),
  ADD CONSTRAINT items_estimated_retail_nonneg
    CHECK (estimated_retail IS NULL OR estimated_retail >= 0);

-- Search is "sku or title, substring, case-insensitive", which a btree cannot
-- serve and which used to be built as a two-column PostgREST or() with the
-- user's raw text spliced into the grammar. One generated column plus one
-- trigram index makes it a single indexed ilike with no grammar to escape.
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS search_text text
    GENERATED ALWAYS AS (sku || ' ' || title) STORED;

CREATE INDEX IF NOT EXISTS items_search_text_trgm_idx
  ON items USING gin (search_text gin_trgm_ops);

-- The default sort, the date_bought filter and the id tiebreak, from one index.
CREATE INDEX IF NOT EXISTS items_batch_date_bought_idx
  ON items (batch_id, date_bought, id);

-- The status filter and the seven head-only counts behind the chips. The
-- status-only index from 001 served nothing: every query is batch-scoped first.
CREATE INDEX IF NOT EXISTS items_batch_status_idx ON items (batch_id, status);

-- category / season: the eq filters and the DISTINCT in item_facets().
CREATE INDEX IF NOT EXISTS items_batch_category_idx ON items (batch_id, category);
CREATE INDEX IF NOT EXISTS items_batch_season_idx   ON items (batch_id, season);

-- subcategory / tags: the && (overlaps) "match any selected value" filters.
CREATE INDEX IF NOT EXISTS items_subcategory_gin_idx ON items USING gin (subcategory);
CREATE INDEX IF NOT EXISTS items_tags_gin_idx        ON items USING gin (tags);

-- Dead since 001: a tsvector GIN index no query ever referenced, and a
-- status-only index superseded above. Dropping them is write-path savings on
-- upload, which inserts a whole batch in one statement.
DROP INDEX IF EXISTS items_title_search_idx;
DROP INDEX IF EXISTS items_status_idx;

-- The distinct values behind the five filter pickers, in one round trip. The
-- alternative is downloading the batch to derive five short lists in the
-- browser, which the performance rules rule out.
CREATE OR REPLACE FUNCTION public.item_facets(p_batch_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'dateBought', COALESCE((
      SELECT jsonb_agg(v ORDER BY v DESC) FROM (
        SELECT DISTINCT date_bought::text AS v FROM items
        WHERE batch_id = p_batch_id AND date_bought IS NOT NULL
      ) s), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(v ORDER BY v) FROM (
        SELECT DISTINCT btrim(category) AS v FROM items
        WHERE batch_id = p_batch_id AND btrim(COALESCE(category, '')) <> ''
      ) s), '[]'::jsonb),
    'seasons', COALESCE((
      SELECT jsonb_agg(v ORDER BY v) FROM (
        SELECT DISTINCT btrim(season) AS v FROM items
        WHERE batch_id = p_batch_id AND btrim(COALESCE(season, '')) <> ''
      ) s), '[]'::jsonb),
    'subcategories', COALESCE((
      SELECT jsonb_agg(v ORDER BY v) FROM (
        SELECT DISTINCT btrim(u) AS v
        FROM items i, unnest(i.subcategory) AS u
        WHERE i.batch_id = p_batch_id AND btrim(u) <> ''
      ) s), '[]'::jsonb),
    'tags', COALESCE((
      SELECT jsonb_agg(v ORDER BY v) FROM (
        SELECT DISTINCT btrim(u) AS v
        FROM items i, unnest(i.tags) AS u
        WHERE i.batch_id = p_batch_id AND btrim(u) <> ''
      ) s), '[]'::jsonb)
  );
$$;

-- Reachable only through the route that runs denyUnlessBatchAccess, never from
-- the browser's anon key.
REVOKE ALL ON FUNCTION public.item_facets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.item_facets(uuid) TO service_role;
