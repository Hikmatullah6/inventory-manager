# Supabase Migrations

Apply migrations manually via the Supabase dashboard SQL Editor:

1. Go to your Supabase project → SQL Editor
2. Paste the contents of the migration file
3. Click Run

Migrations are numbered sequentially. Apply them in order.

**Apply a migration before deploying the code that needs it.** `select('*')`
tolerates columns that do not exist yet, but a filter, an index or an rpc against
a missing object fails outright.

## 005_new_import_format.sql

Adds the 18-column import sheet's columns, the `search_text` generated column and
its trigram index, an index per filter, and the `item_facets()` function. The app
will not filter, search or export correctly until it has run.

There is no Jest coverage for `item_facets()` — there is no Postgres in the test
run, and mocking `rpc` would only test the mock. Check it by hand once after
applying, against a batch with a few tagged items:

```sql
-- Expect four sorted arrays; tags/subcategories flattened and deduped.
select item_facets('<a batch id>');
```
