import { buildPersonalUseCSV } from '@/lib/csv-export';
import { csvExportRoute } from '@/lib/export-route';

export const GET = csvExportRoute({
  build: buildPersonalUseCSV,
  status: 'personal_use',
  suffix: 'personal-use',
});
