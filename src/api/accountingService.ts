import { getDb } from './database';
import { RefAccounting } from '../constants/types';

export const accountingService = {
  importAccountingData: async (data: RefAccounting[]) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.execAsync('DELETE FROM ref_accounting');

    let skipped = 0;
    let imported = 0;
    for (const item of data) {
      if (!item.nama_accounting) {
        skipped++;
        continue;
      }

      await db.runAsync(
        `INSERT INTO ref_accounting (
          no_invoice, nama_accounting, spesifikasi, pembuat,
          daya_kw, tahun_buat, tahun_beli, departemen, catatan_acc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(item.no_invoice  || ''),
          String(item.nama_accounting  || ''),
          String(item.spesifikasi || ''),
          String(item.pembuat     || ''),
          String(item.daya_kw     || ''),
          String(item.tahun_buat  || ''),
          String(item.tahun_beli  || ''),
          String(item.departemen  || ''),
          String(item.catatan_acc || '')
        ]
      );
      imported++;
    }

    return { imported, skipped, total: data.length };
  },

  hasData: async (): Promise<boolean> => {
    const db = await getDb();
    if (!db) return false;
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
    return (row?.count || 0) > 0;
  },

  getAll: async (): Promise<RefAccounting[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db.getAllAsync<RefAccounting>(
        'SELECT * FROM ref_accounting ORDER BY nama_accounting ASC'
      );
      // Pastikan tidak ada null di nama_accounting supaya filter aman
      return rows.filter(r => r.nama_accounting != null && String(r.nama_accounting).trim() !== '');
    } catch (err: any) {
      console.error('[accountingService.getAll] error:', err?.message || err);
      return [];
    }
  },

  search: async (query: string): Promise<RefAccounting[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db.getAllAsync<RefAccounting>(
        'SELECT * FROM ref_accounting WHERE (nama_accounting LIKE ? OR no_invoice LIKE ?) AND nama_accounting IS NOT NULL LIMIT 20',
        [`%${query}%`, `%${query}%`]
      );
      return rows.filter(r => r.nama_accounting != null && String(r.nama_accounting).trim() !== '');
    } catch (err: any) {
      console.error('[accountingService.search] error:', err?.message || err);
      return [];
    }
  },

  getStats: async () => {
    const db = await getDb();
    if (!db) return { total: 0, verified: 0 };
    const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
    const verified = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting WHERE is_verified = 1');

    return {
      total: total?.count || 0,
      verified: verified?.count || 0
    };
  },

  getUnverified: async (): Promise<RefAccounting[]> => {
    const db = await getDb();
    if (!db) return [];
    return await db.getAllAsync<RefAccounting>('SELECT * FROM ref_accounting WHERE is_verified = 0 ORDER BY nama_accounting ASC');
  }
};
