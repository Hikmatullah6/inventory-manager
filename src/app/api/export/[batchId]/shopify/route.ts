import { buildShopifyCSV } from '@/lib/csv-export';
import { csvExportRoute } from '@/lib/export-route';

export const GET = csvExportRoute({ build: buildShopifyCSV, suffix: 'shopify' });
