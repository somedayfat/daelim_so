import { getDb } from './database';
import { HasilSO, SODashboardStats } from '../constants/types';

export const hasilSoService = {
  getSummaryStats: async (): Promise<SODashboardStats> => {
    const db = await getDb();
    if (!db) {
      return { totalAccounting: 0, sudahSO: 0, belumSO: 0, assetBaru: 0, progress: 0 };
    }
    
    const accCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
    const soCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM hasil_so WHERE status_so = "FINAL"');
    const newAssets = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM hasil_so WHERE status_match = "BARU"');
    
    const total = accCount?.count || 0;
    const sudah = soCount?.count || 0;
    const baru = newAssets?.count || 0;
    const belum = total - sudah;
    const progress = total > 0 ? Math.round((sudah / total) * 100) : 0;

    return {
      totalAccounting: total,
      sudahSO: sudah,
      belumSO: belum,
      assetBaru: baru,
      progress
    };
  },

  saveHasil: async (data: HasilSO) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM hasil_so WHERE no_asset = ?', [data.no_asset]);
    
    const params = [
      data.nama_lapangan || '',
      data.spesifikasi || '',
      data.pembuat || '',
      data.daya_kw || '',
      data.tahun_buat || '',
      data.tahun_beli || '',
      data.departemen || '',
      data.no_invoice || '',
      data.status_pengadaan || 'Beli',
      data.catatan || '',
      data.status_match || 'BARU',
      data.status_so || 'DRAFT',
      data.foto_path || '',
      data.ref_accounting_id || null,
      data.nama_accounting || null
    ];

    if (existing) {
      await db.runAsync(
        'UPDATE hasil_so SET nama_lapangan = ?, spesifikasi = ?, pembuat = ?, daya_kw = ?, tahun_buat = ?, tahun_beli = ?, departemen = ?, no_invoice = ?, status_pengadaan = ?, catatan = ?, status_match = ?, status_so = ?, foto_path = ?, ref_accounting_id = ?, nama_accounting = ? WHERE id = ?',
        [...params, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO hasil_so (no_asset, nama_lapangan, spesifikasi, pembuat, daya_kw, tahun_buat, tahun_beli, departemen, no_invoice, status_pengadaan, catatan, status_match, status_so, foto_path, ref_accounting_id, nama_accounting) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [data.no_asset, ...params]
      );
    }

    // Jika status FINAL, update tabel accounting
    if (data.status_so === 'FINAL' && data.ref_accounting_id) {
      await db.runAsync('UPDATE ref_accounting SET is_verified = 1 WHERE id = ?', [data.ref_accounting_id]);
    }
  },

  getAllHasil: async (search: string, status: string): Promise<HasilSO[]> => {
    const db = await getDb();
    if (!db) return [];

    let query = 'SELECT * FROM hasil_so WHERE (nama_lapangan LIKE ? OR no_asset LIKE ?)';
    const params: any[] = [`%${search}%`, `%${search}%`];

    if (status !== 'Semua') {
      query += ' AND status_so = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY id DESC';
    return await db.getAllAsync<HasilSO>(query, params);
  }
};
