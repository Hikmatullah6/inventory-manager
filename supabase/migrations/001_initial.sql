-- supabase/migrations/001_initial.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE auction_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES auction_batches(id) ON DELETE CASCADE,
  sku text NOT NULL,
  link text,
  title text NOT NULL,
  thumbnail_url text,
  image_count integer,
  description text,
  date_bought date,
  cost numeric,
  company_name text,
  location_bought text,
  auction_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'have_it', 'dont_have', 'broken', 'partial')),
  qty_good integer,
  qty_broken integer,
  qty_sold integer NOT NULL DEFAULT 0,
  shelf_location text,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX items_batch_id_idx ON items(batch_id);
CREATE INDEX items_status_idx ON items(status);
CREATE INDEX items_title_search_idx ON items USING gin(to_tsvector('english', title));
