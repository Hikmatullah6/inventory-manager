-- supabase/migrations/002_auction_date_range.sql
-- Store the end date of auction date ranges (e.g. "1/22/2026 - 1/27/2026")

ALTER TABLE items ADD COLUMN IF NOT EXISTS auction_date_end date;
