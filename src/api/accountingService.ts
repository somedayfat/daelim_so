import { getDb } from './database';
import { RefAccounting } from '../constants/types';

export const accountingService = {
  importAccountingData: async (data: RefAccounting[]) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.execAsync('DELETE FROM ref_accounting');

    // V2: Auto-Grouping Logic
    // Jika ada Nama + Spek yang sama, gabungkan dan jumlahkan QTY-nya
    const groupedData: Record<string, RefAccounting> = {};

    for (const item of data) {
      if (!item.nama_accounting) continue;
      
      const cleanName = item.nama_accounting.trim().toLowerCase();
      const cleanSpec = (item.spesifikasi || '').trim().toLowerCase();
      const key = `${cleanName}_${cleanSpec}`;
      
      if (groupedData[key]) {
        // Jika sudah ada, tambahkan QTY-nya
        const currentQty = groupedData[key].qty_accounting || 0;
        const newQty = item.qty_accounting || 1;
        groupedData[key].qty_accounting = currentQty + newQty;
      } else {
        // Jika belum ada, buat entry baru
        groupedData[key] = { 
          ...item, 
          nama_accounting: item.nama_accounting.trim(),
          spesifikasi: (item.spesifikasi || '').trim(),
          qty_accounting: item.qty_accounting || 1 
        };
      }
    }

    const finalItems = Object.values(groupedData);
    let imported = 0;

    for (const item of finalItems) {
      await db.runAsync(
        `INSERT INTO ref_accounting (
          no_invoice, nama_accounting, spesifikasi, pembuat,
          daya_kw, tahun_buat, tahun_beli, departemen, catatan_acc, qty_accounting
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(item.no_invoice  || ''),
          String(item.nama_accounting  || ''),
          String(item.spesifikasi || ''),
          String(item.pembuat     || ''),
          String(item.daya_kw     || ''),
          String(item.tahun_buat  || ''),
          String(item.tahun_beli  || ''),
          String(item.departemen  || ''),
          String(item.catatan_acc || ''),
          Number(item.qty_accounting || 1)
        ]
      );
      imported++;
    }

    return { imported, skipped: data.length - imported, total: data.length };
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
