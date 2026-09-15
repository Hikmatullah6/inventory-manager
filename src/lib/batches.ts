// src/lib/batches.ts
import { getSupabaseServer } from './supabase-server';
import type { AuctionBatch } from './types';

/**
 * Every batch with its item counts.
 *
 * Used by the home page directly rather than through /api/batches: a server
 * component calling its own HTTP route adds a round trip and a serialisation
 * hop for data it could read straight from the database.
 *
 * Note this returns `has_pin`, never the hash itself.
 */
export async function listBatches(): Promise<AuctionBatch[]> {
  const supabase = getSupabaseServer();

  const { data: batches } = await supabase
    .from('auction_batches')
    .select('id, name, imported_at, pin_hash')
    .order('imported_at', { ascending: false });

  return Promise.all(
    (batches ?? []).map(async batch => {
      const [{ count: total }, { count: reviewed }] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batch.id),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batch.id).neq('status', 'pending'),
      ]);
      return {
        id: batch.id,
        name: batch.name,
        imported_at: batch.imported_at,
        has_pin: batch.pin_hash !== null,
        item_count: total ?? 0,
        reviewed_count: reviewed ?? 0,
      };
    })
  );
}
