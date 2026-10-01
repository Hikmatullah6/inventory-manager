-- 006_filter_counts.sql
--
-- Every number the review screen's filter UI shows, in one round trip: the seven
-- status chip counts, and a count for each category / subcategory / tag / season
-- / month / day value in the batch.
--
-- The alternative is a count query per option, and a real batch has 714 tags and
-- 145 subcategories — 900+ round trips per keystroke. This is one GROUP BY pass
-- per facet over the batch.
--
-- Faceted-search semantics: each facet is counted against every OTHER selection
-- but ignoring its own, so after picking a category you can still see which tags
-- remain available, and picking a second tag stays possible. A value that would
-- return nothing comes back with count 0, which the UI greys out.
--
-- Supersedes item_facets() from 005. That function is left in place so a rollback
-- to the previous deploy keeps working; nothing in the current code calls it.

CREATE OR REPLACE FUNCTION public.item_filter_counts(
  p_batch_id       uuid,
  -- Already escaped for LIKE by the caller (see escapeLikeTerm).
  p_search         text   DEFAULT '',
  -- NULL means "all statuses".
  p_status         text   DEFAULT NULL,
  p_categories     text[] DEFAULT '{}',
  p_subcategories  text[] DEFAULT '{}',
  p_tags           text[] DEFAULT '{}',
  p_seasons        text[] DEFAULT '{}',
  -- 'YYYY-MM'. Days narrow within the selected months.
  p_months         text[] DEFAULT '{}',
  p_dates          date[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH f AS (
    SELECT
      i.status,
      i.category,
      i.subcategory,
      i.tags,
      i.season,
      i.date_bought,
      -- coalesce throughout: a NULL argument would make the predicate NULL, and
      -- `WHERE m_search AND ...` would then drop every row and report all zeros.
      (coalesce(p_search, '') = ''
        OR i.search_text ILIKE '%' || p_search || '%')                           AS m_search,
      (p_status IS NULL OR i.status = p_status)                                  AS m_status,
      (coalesce(cardinality(p_categories), 0) = 0
        OR i.category = ANY(p_categories))                                       AS m_category,
      (coalesce(cardinality(p_subcategories), 0) = 0
        OR i.subcategory && p_subcategories)                                     AS m_subcategory,
      (coalesce(cardinality(p_tags), 0) = 0 OR i.tags && p_tags)                 AS m_tags,
      (coalesce(cardinality(p_seasons), 0) = 0 OR i.season = ANY(p_seasons))     AS m_season,
      (
        (coalesce(cardinality(p_months), 0) = 0
          OR to_char(i.date_bought, 'YYYY-MM') = ANY(p_months))
        AND (coalesce(cardinality(p_dates), 0) = 0 OR i.date_bought = ANY(p_dates))
      )                                                                          AS m_date
    FROM items i
    WHERE i.batch_id = p_batch_id
  ),

  -- One row per status, counted against every filter except the status itself.
  status_counts AS (
    SELECT status, count(*) AS c
    FROM f
    WHERE m_search AND m_category AND m_subcategory AND m_tags AND m_season AND m_date
    GROUP BY status
  ),

  -- Scalar facets: every distinct value in the batch, left-joined to the count
  -- that survives the other filters, so unavailable values come back as 0.
  cat_values AS (
    SELECT DISTINCT btrim(category) AS v FROM f WHERE btrim(coalesce(category, '')) <> ''
  ),
  cat_counts AS (
    SELECT btrim(category) AS v, count(*) AS c
    FROM f
    WHERE m_search AND m_status AND m_subcategory AND m_tags AND m_season AND m_date
      AND btrim(coalesce(category, '')) <> ''
    GROUP BY 1
  ),

  season_values AS (
    SELECT DISTINCT btrim(season) AS v FROM f WHERE btrim(coalesce(season, '')) <> ''
  ),
  season_counts AS (
    SELECT btrim(season) AS v, count(*) AS c
    FROM f
    WHERE m_search AND m_status AND m_category AND m_subcategory AND m_tags AND m_date
      AND btrim(coalesce(season, '')) <> ''
    GROUP BY 1
  ),

  -- Array facets: unnested, so a row with three tags counts once per tag.
  sub_values AS (
    SELECT DISTINCT btrim(u) AS v FROM f, unnest(f.subcategory) AS u WHERE btrim(u) <> ''
  ),
  sub_counts AS (
    SELECT btrim(u) AS v, count(*) AS c
    FROM f, unnest(f.subcategory) AS u
    WHERE m_search AND m_status AND m_category AND m_tags AND m_season AND m_date
      AND btrim(u) <> ''
    GROUP BY 1
  ),

  tag_values AS (
    SELECT DISTINCT btrim(u) AS v FROM f, unnest(f.tags) AS u WHERE btrim(u) <> ''
  ),
  tag_counts AS (
    SELECT btrim(u) AS v, count(*) AS c
    FROM f, unnest(f.tags) AS u
    WHERE m_search AND m_status AND m_category AND m_subcategory AND m_season AND m_date
      AND btrim(u) <> ''
    GROUP BY 1
  ),

  -- Months and days are one dimension: both ignore the whole date selection, so
  -- the day list does not empty itself out as soon as a day is ticked.
  month_values AS (
    SELECT DISTINCT to_char(date_bought, 'YYYY-MM') AS v FROM f WHERE date_bought IS NOT NULL
  ),
  month_counts AS (
    SELECT to_char(date_bought, 'YYYY-MM') AS v, count(*) AS c
    FROM f
    WHERE m_search AND m_status AND m_category AND m_subcategory AND m_tags AND m_season
      AND date_bought IS NOT NULL
    GROUP BY 1
  ),

  date_values AS (
    SELECT DISTINCT date_bought AS v FROM f WHERE date_bought IS NOT NULL
  ),
  date_counts AS (
    SELECT date_bought AS v, count(*) AS c
    FROM f
    WHERE m_search AND m_status AND m_category AND m_subcategory AND m_tags AND m_season
      AND date_bought IS NOT NULL
    GROUP BY 1
  )

  SELECT jsonb_build_object(
    'statuses', COALESCE((
      SELECT jsonb_object_agg(status, c) FROM status_counts
    ), '{}'::jsonb),

    'category', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', v.v, 'count', COALESCE(c.c, 0))
                       ORDER BY COALESCE(c.c, 0) DESC, v.v)
      FROM cat_values v LEFT JOIN cat_counts c ON c.v = v.v
    ), '[]'::jsonb),

    'subcategory', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', v.v, 'count', COALESCE(c.c, 0))
                       ORDER BY COALESCE(c.c, 0) DESC, v.v)
      FROM sub_values v LEFT JOIN sub_counts c ON c.v = v.v
    ), '[]'::jsonb),

    'tags', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', v.v, 'count', COALESCE(c.c, 0))
                       ORDER BY COALESCE(c.c, 0) DESC, v.v)
      FROM tag_values v LEFT JOIN tag_counts c ON c.v = v.v
    ), '[]'::jsonb),

    'season', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', v.v, 'count', COALESCE(c.c, 0))
                       ORDER BY COALESCE(c.c, 0) DESC, v.v)
      FROM season_values v LEFT JOIN season_counts c ON c.v = v.v
    ), '[]'::jsonb),

    -- Newest first: the month you just bought is the one you are looking at.
    'months', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('value', v.v, 'count', COALESCE(c.c, 0))
                       ORDER BY v.v DESC)
      FROM month_values v LEFT JOIN month_counts c ON c.v = v.v
    ), '[]'::jsonb),

    'dates', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'value', v.v::text,
               'month', to_char(v.v, 'YYYY-MM'),
               'count', COALESCE(c.c, 0))
                       ORDER BY v.v DESC)
      FROM date_values v LEFT JOIN date_counts c ON c.v = v.v
    ), '[]'::jsonb)
  );
$$;

-- Reachable only through the route that runs denyUnlessBatchAccess, never from
-- the browser's anon key.
REVOKE ALL ON FUNCTION public.item_filter_counts(
  uuid, text, text, text[], text[], text[], text[], text[], date[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.item_filter_counts(
  uuid, text, text, text[], text[], text[], text[], text[], date[]
) TO service_role;
