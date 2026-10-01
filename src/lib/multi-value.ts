// src/lib/multi-value.ts

/**
 * `subcategory` and `tags` are one comma-separated cell in the import sheet and
 * a `text[]` column in Postgres. The split and the join are one pair of
 * functions so the importer and the exporter cannot drift into two conventions
 * — nothing in the type system links them otherwise.
 *
 * A consequence worth knowing: an individual value can never contain a comma.
 * CSV quoting does not help, because the quotes delimit the cell and we split
 * its contents afterwards.
 */

/** What joins values inside one cell on the way out. */
export const MULTI_SEPARATOR = ', ';

/** "tools, heavy ,, tools" -> ['tools', 'heavy'] */
export function splitMulti(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];
}

/** ['tools', 'heavy'] -> "tools, heavy";  [] -> null, so the cell stays blank. */
export function joinMulti(values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.join(MULTI_SEPARATOR);
}
