-- Add 'sold' and 'personal_use' to status check constraint, and add sale_price column
ALTER TABLE items
  DROP CONSTRAINT IF EXISTS items_status_check,
  ADD CONSTRAINT items_status_check
    CHECK (status IN ('pending','have_it','dont_have','broken','partial','sold','personal_use')),
  ADD COLUMN IF NOT EXISTS sale_price numeric;
