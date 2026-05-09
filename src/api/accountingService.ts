import { getDb } from './database';
import { RefAccounting } from '../constants/types';

export const accountingService = {
  // Clear and bulk insert accounting data
  importAccountingData: async (data: RefAccounting[]) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Clear existing data (as per design.md warning)
    await db.execAsync('DELETE FROM ref_accounting');
    
    // Bulk insert using transaction for performance
    for (const item of data) {
      if (!item.nama_accounting) continue; // Basic validation
      
      await db.runAsync(
        `INSERT INTO ref_accounting (
          no_invoice, nama_accounting, spesifikasi, pembuat, 
          daya_kw, tahun_buat, tahun_beli, departemen, catatan_acc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.no_invoice || '',
          item.nama_accounting,
          item.spesifikasi || '',
          item.pembuat || '',
          item.daya_kw || '',
          item.tahun_buat || '',
          item.tahun_beli || '',
          item.departemen || '',
          item.catatan_acc || ''
        ]
      );
    }
    
    return data.length;
  },

  getAll: async (): Promise<RefAccounting[]> => {
    const db = await getDb();
    if (!db) return [];
    return await db.getAllAsync<RefAccounting>('SELECT * FROM ref_accounting ORDER BY nama_accounting ASC');
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
    return await db.getAllAsync<RefAccounting>('SELECT * FROM ref_accounting WHERE is_verified = 0');
  }
};
