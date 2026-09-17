import { buildSoldCSV } from '@/lib/csv-export';
import { csvExportRoute } from '@/lib/export-route';

export const GET = csvExportRoute({ build: buildSoldCSV, status: 'sold', suffix: 'sold' });
