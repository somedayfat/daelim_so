import { getDb } from './database';
import { HasilSO, SODashboardStats, computeQtyStatus } from '../constants/types';

export interface RekapDetailStats {
  totalAccounting: number; // Total Unit dari Master Excel
  totalAktual: number;     // Total Unit yang ditemukan di lapangan
  selisih: number;         // totalAktual - totalAccounting
  totalTipe: number;       // Jumlah Model/Baris di Excel
  sudahSO: number;         // Jumlah Model yang sudah di-input
  belumSO: number;         // Jumlah Model yang belum disentuh
  matchCount: number;      // Tipe Item dengan Qty pas
  bedaNamaCount: number;   // Tipe Item dengan Qty kurang
  lebihCount: number;      // Tipe Item dengan Qty lebih
  tidakAdaFisikCount: number; // Tipe Item dengan Qty 0
  finalCount: number;
  draftCount: number;
  progress: number;
}

export const hasilSoService = {
  saveHasil: async (data: HasilSO) => {
    const db = await getDb();
    if (!db) return;

    const selisih = (data.qty_aktual || 0) - (data.qty_accounting || 0);
    const statusMatch = computeQtyStatus(
      data.qty_aktual || 0,
      data.qty_accounting || 0,
      !!data.ref_accounting_id
    );

    const fotoPathsJson = data.foto_paths || '[]';

    if (data.id) {
      await db.runAsync(
        `UPDATE hasil_so SET 
          no_so = ?,
          nama_lapangan = ?, 
          nama_accounting = ?,
          ref_accounting_id = ?, 
          spesifikasi = ?, 
          pembuat = ?, 
          daya_kw = ?, 
          tahun_buat = ?, 
          tahun_beli = ?, 
          departemen = ?, 
          no_invoice = ?, 
          qty_accounting = ?,
          qty_aktual = ?,
          selisih = ?,
          status_pengadaan = ?, 
          kondisi = ?, 
          foto_paths = ?, 
          catatan = ?, 
          status_match = ?, 
          status_so = ?, 
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          data.no_so,
          data.nama_lapangan,
          data.nama_accounting || '',
          data.ref_accounting_id || null,
          data.spesifikasi || '',
          data.pembuat || '',
          data.daya_kw || '',
          data.tahun_buat || '',
          data.tahun_beli || '',
          data.departemen || '',
          data.no_invoice || '',
          data.qty_accounting || 0,
          data.qty_aktual || 0,
          selisih,
          data.status_pengadaan || 'Beli',
          data.kondisi || 'Lama',
          fotoPathsJson,
          data.catatan || '',
          statusMatch,
          data.status_so || 'DRAFT',
          data.id
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO hasil_so (
          no_so, ref_accounting_id, nama_lapangan, nama_accounting, spesifikasi, pembuat, 
          daya_kw, tahun_buat, tahun_beli, departemen, no_invoice, 
          qty_accounting, qty_aktual, selisih, status_pengadaan, kondisi, 
          foto_paths, catatan, status_match, status_so, so_session, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          data.no_so,
          data.ref_accounting_id || null,
          data.nama_lapangan,
          data.nama_accounting || '',
          data.spesifikasi || '',
          data.pembuat || '',
          data.daya_kw || '',
          data.tahun_buat || '',
          data.tahun_beli || '',
          data.departemen || '',
          data.no_invoice || '',
          data.qty_accounting || 0,
          data.qty_aktual || 0,
          selisih,
          data.status_pengadaan || 'Beli',
          data.kondisi || 'Lama',
          fotoPathsJson,
          data.catatan || '',
          statusMatch,
          data.status_so || 'DRAFT',
          data.so_session || ''
        ]
      );
    }

    if (data.ref_accounting_id) {
      await db.runAsync('UPDATE ref_accounting SET is_verified = 1 WHERE id = ?', [data.ref_accounting_id]);
    }
  },

  getAllHasil: async (query: string = '', status: string = 'Semua'): Promise<HasilSO[]> => {
    const db = await getDb();
    if (!db) return [];
    
    let sql = 'SELECT * FROM hasil_so WHERE 1=1';
    const params: any[] = [];

    if (query) {
      sql += ' AND (nama_lapangan LIKE ? OR nama_accounting LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    if (status !== 'Semua') {
      sql += ' AND status_so = ?';
      params.push(status.toUpperCase());
    }

    sql += ' ORDER BY updated_at DESC';
    return await db.getAllAsync<HasilSO>(sql, params);
  },

  getSummaryStats: async (dept: string = 'Semua'): Promise<SODashboardStats> => {
    const db = await getDb();
    if (!db) return { totalAccounting: 0, sudahSO: 0, belumSO: 0, assetBaru: 0, progress: 0, totalQtyAccounting: 0, totalQtyAktual: 0, selisihTotal: 0 };

    let refBase = 'FROM ref_accounting';
    let hasilBase = 'FROM hasil_so';
    const params: any[] = [];

    if (dept !== 'Semua') {
      refBase += ' WHERE departemen = ?';
      hasilBase += ' WHERE departemen = ?';
      params.push(dept);
    }

    // Total Tipe Item (Baris)
    const totalTipeRes = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count ${refBase}`, params);
    const totalTipe = totalTipeRes?.count || 0;

    // Tipe yang sudah di-SO
    const sudahSoRes = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count ${hasilBase}`, params);
    const sudahSo = sudahSoRes?.count || 0;

    // Total UNIT (SUM Qty) dari MASTER
    const qtyAccRes = await db.getFirstAsync<{ total: number }>(`SELECT SUM(qty_accounting) as total ${refBase}`, params);
    const totalQtyAcc = qtyAccRes?.total || 0;

    // Total UNIT (SUM Qty) dari HASIL LAPANGAN
    const qtyAktRes = await db.getFirstAsync<{ total: number }>(`SELECT SUM(qty_aktual) as total ${hasilBase}`, params);
    const totalQtyAkt = qtyAktRes?.total || 0;

    return {
      totalAccounting: totalTipe,
      sudahSO: sudahSo,
      belumSO: Math.max(0, totalTipe - sudahSo),
      assetBaru: 0,
      progress: totalTipe > 0 ? Math.round((sudahSo / totalTipe) * 100) : 0,
      totalQtyAccounting: totalQtyAcc,
      totalQtyAktual: totalQtyAkt,
      selisihTotal: totalQtyAkt - totalQtyAcc
    };
  },

  getDetailedStats: async (): Promise<RekapDetailStats> => {
    const db = await getDb();
    if (!db) return { 
      totalAccounting: 0, totalAktual: 0, selisih: 0, totalTipe: 0, 
      sudahSO: 0, belumSO: 0, matchCount: 0, bedaNamaCount: 0, 
      lebihCount: 0, tidakAdaFisikCount: 0, finalCount: 0, draftCount: 0, progress: 0 
    };
    
    const summary = await hasilSoService.getSummaryStats();
    
    const match = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'MATCH'");
    const kurang = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'KURANG'");
    const lebih = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'LEBIH'");
    const tidakAda = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'TIDAK_ADA'");
    const final = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_so = 'FINAL'");
    const draft = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_so = 'DRAFT'");

    return {
      totalAccounting: summary.totalQtyAccounting,
      totalAktual: summary.totalQtyAktual,
      selisih: summary.selisihTotal,
      totalTipe: summary.totalAccounting,
      sudahSO: summary.sudahSO,
      belumSO: summary.belumSO,
      matchCount: match?.count || 0,
      bedaNamaCount: kurang?.count || 0,
      lebihCount: lebih?.count || 0,
      tidakAdaFisikCount: tidakAda?.count || 0,
      finalCount: final?.count || 0,
      draftCount: draft?.count || 0,
      progress: summary.progress
    };
  },

  deleteHasil: async (id: number) => {
    const db = await getDb();
    if (!db) return;
    
    const row = await db.getFirstAsync<{ ref_accounting_id: number }>('SELECT ref_accounting_id FROM hasil_so WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM hasil_so WHERE id = ?', [id]);
    
    if (row?.ref_accounting_id) {
      const remaining = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM hasil_so WHERE ref_accounting_id = ?', [row.ref_accounting_id]);
      if (!remaining || remaining.count === 0) {
        await db.runAsync('UPDATE ref_accounting SET is_verified = 0 WHERE id = ?', [row.ref_accounting_id]);
      }
    }
  },

  getPreviousQty: async (refId: number, excludeId?: number): Promise<number> => {
    const db = await getDb();
    if (!db || !refId) return 0;
    
    let sql = 'SELECT SUM(qty_aktual) as total FROM hasil_so WHERE ref_accounting_id = ?';
    const params: any[] = [refId];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const res = await db.getFirstAsync<{ total: number }>(sql, params);
    return res?.total || 0;
  }
};
