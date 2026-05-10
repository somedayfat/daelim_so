import { getDb } from './database';
import { HasilSO, SODashboardStats } from '../constants/types';
import { generateNextAssetNumber } from './utils';

export interface RekapDetailStats extends SODashboardStats {
  matchCount: number;
  bedaNamaCount: number;
  baruCount: number;
  tidakAdaFisikCount: number;
  finalCount: number;
  draftCount: number;
}

export const hasilSoService = {
  getSummaryStats: async (): Promise<SODashboardStats> => {
    const db = await getDb();
    if (!db) {
      return { totalAccounting: 0, sudahSO: 0, belumSO: 0, assetBaru: 0, progress: 0 };
    }

    const accCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
    const soCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM hasil_so');
    const newAssets = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'BARU'");

    const totalAcc = accCount?.count || 0;
    const sudah = soCount?.count || 0;
    const baru = newAssets?.count || 0;
    const total = totalAcc + baru;
    const belum = total - sudah;
    const progress = total > 0 ? Math.round((sudah / total) * 100) : 0;

    return {
      totalAccounting: total,
      sudahSO: sudah,
      belumSO: Math.max(0, belum),
      assetBaru: baru,
      progress: Math.min(100, progress)
    };
  },

  getDetailedStats: async (): Promise<RekapDetailStats> => {
    const db = await getDb();
    if (!db) {
      const base = await hasilSoService.getSummaryStats();
      return { ...base, matchCount: 0, bedaNamaCount: 0, baruCount: 0, tidakAdaFisikCount: 0, finalCount: 0, draftCount: 0 };
    }

    const base = await hasilSoService.getSummaryStats();

    const matchCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'MATCH'");
    const bedaNamaCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'BEDA_NAMA'");
    const baruCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'BARU'");
    const tidakAdaFisikCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_match = 'TIDAK_ADA_FISIK'");
    const finalCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_so = 'FINAL'");
    const draftCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM hasil_so WHERE status_so = 'DRAFT'");

    return {
      ...base,
      matchCount: matchCount?.count || 0,
      bedaNamaCount: bedaNamaCount?.count || 0,
      baruCount: baruCount?.count || 0,
      tidakAdaFisikCount: tidakAdaFisikCount?.count || 0,
      finalCount: finalCount?.count || 0,
      draftCount: draftCount?.count || 0,
    };
  },

  /**
   * Simpan 1 record hasil SO.
   * BUG FIX: Pastikan jumlah params dan ? pada SQL selalu sinkron (17 fields).
   */
  saveHasil: async (data: HasilSO) => {
    const db = await getDb();
    if (!db) throw new Error('Database tidak tersedia');
    if (!data.no_asset) throw new Error('No Asset kosong, gagal simpan');

    console.log('[saveHasil] no_asset:', data.no_asset, 'status:', data.status_so);

    const now = new Date().toISOString();
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM hasil_so WHERE no_asset = ?',
      [data.no_asset]
    );

    // CRITICAL: expo-sqlite on Android throws NPE when binding null.
    // All params MUST be string or number — never null or undefined.
    const safeStr = (val: string | undefined | null): string => (val == null ? '' : String(val));
    const safeNum = (val: number | undefined | null): number => (val == null ? 0 : Number(val));
    const safeStatusMatch = (val: string | undefined): string =>
      ['MATCH', 'BEDA_NAMA', 'BARU', 'TIDAK_ADA_FISIK'].includes(val ?? '') ? (val as string) : 'BARU';
    const safeStatusSo = (val: string | undefined): string =>
      ['DRAFT', 'FINAL'].includes(val ?? '') ? (val as string) : 'DRAFT';
    const safeStatusPengadaan = (val: string | undefined): string =>
      ['Beli', 'Buat Sendiri'].includes(val ?? '') ? (val as string) : 'Beli';

    // Use 0 for null ref_id (SQLite int), empty string for null text
    const refAccId: number = safeNum(data.ref_accounting_id);
    const namaAcc: string = safeStr(data.nama_accounting);

    try {
      if (existing) {
        // UPDATE: 17 field + updated_at + WHERE id = ? = 19 params total
        await db.runAsync(
          `UPDATE hasil_so SET
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
            status_pengadaan = ?,
            foto_path = ?,
            catatan = ?,
            status_match = ?,
            status_so = ?,
            updated_at = ?
          WHERE id = ?`,
          [
            safeStr(data.nama_lapangan),              // 1
            namaAcc,                                   // 2
            refAccId,                                  // 3
            safeStr(data.spesifikasi),                // 4
            safeStr(data.pembuat),                    // 5
            safeStr(data.daya_kw),                    // 6
            safeStr(data.tahun_buat),                 // 7
            safeStr(data.tahun_beli),                 // 8
            safeStr(data.departemen),                 // 9
            safeStr(data.no_invoice),                 // 10
            safeStatusPengadaan(data.status_pengadaan), // 11
            safeStr(data.foto_path),                  // 12
            safeStr(data.catatan),                    // 13
            safeStatusMatch(data.status_match),       // 14
            safeStatusSo(data.status_so),             // 15
            now,                                       // 16 updated_at
            safeNum(existing.id),                     // 17 WHERE id
          ]
        );
        console.log('[saveHasil] UPDATED id:', existing.id);
      } else {
        // INSERT: no_asset + 15 field + created_at = 17 params total
        await db.runAsync(
          `INSERT INTO hasil_so (
            no_asset, nama_lapangan, nama_accounting, ref_accounting_id,
            spesifikasi, pembuat, daya_kw, tahun_buat, tahun_beli,
            departemen, no_invoice, status_pengadaan, foto_path,
            catatan, status_match, status_so, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            safeStr(data.no_asset),                    // 1
            safeStr(data.nama_lapangan),               // 2
            namaAcc,                                    // 3
            refAccId,                                   // 4
            safeStr(data.spesifikasi),                 // 5
            safeStr(data.pembuat),                     // 6
            safeStr(data.daya_kw),                     // 7
            safeStr(data.tahun_buat),                  // 8
            safeStr(data.tahun_beli),                  // 9
            safeStr(data.departemen),                  // 10
            safeStr(data.no_invoice),                  // 11
            safeStatusPengadaan(data.status_pengadaan), // 12
            safeStr(data.foto_path),                   // 13
            safeStr(data.catatan),                     // 14
            safeStatusMatch(data.status_match),        // 15
            safeStatusSo(data.status_so),              // 16
            now,                                        // 17 created_at
          ]
        );
        console.log('[saveHasil] INSERTED:', data.no_asset);
      }
    } catch (err: any) {
      console.error('[saveHasil] DB error:', err?.message || err);
      throw new Error('Gagal simpan ke database: ' + (err?.message || String(err)));
    }

    // Update is_verified jika FINAL dan terhubung ke accounting
    if (data.status_so === 'FINAL' && refAccId && refAccId > 0) {
      try {
        await db.runAsync('UPDATE ref_accounting SET is_verified = 1 WHERE id = ?', [refAccId]);
      } catch (err: any) {
        console.error('[saveHasil] Update verified error:', err?.message || err);
      }
    }
  },

  /**
   * Simpan BATCH: dari 1 form data → N rows dengan no_asset berurutan.
   * @param baseData  data form yang sudah diisi user
   * @param qty       jumlah unit (tidak dibatasi)
   * @param status    DRAFT atau FINAL
   * @returns         array no_asset yang berhasil disimpan
   */
  saveBatch: async (
    baseData: Partial<HasilSO>,
    qty: number,
    status: 'DRAFT' | 'FINAL'
  ): Promise<string[]> => {
    const savedAssets: string[] = [];

    for (let i = 0; i < qty; i++) {
      const nextNo = await generateNextAssetNumber();
      const rowData: HasilSO = {
        ...(baseData as HasilSO),
        no_asset: nextNo,
        status_so: status,
        foto_path: '',  // foto diisi nanti via flow sequential
      };
      await hasilSoService.saveHasil(rowData);
      savedAssets.push(nextNo);
    }

    return savedAssets;
  },

  getAllHasil: async (search: string, status: string, departemen?: string): Promise<HasilSO[]> => {
    const db = await getDb();
    if (!db) return [];

    let query = 'SELECT * FROM hasil_so WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (nama_lapangan LIKE ? OR nama_accounting LIKE ? OR no_asset LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status !== 'Semua') {
      if (status === 'Belum di-SO') {
        query += " AND status_so = 'DRAFT'";
      } else {
        query += ' AND status_so = ?';
        params.push(status.toUpperCase());
      }
    }

    if (departemen) {
      query += ' AND departemen = ?';
      params.push(departemen);
    }

    query += ' ORDER BY id DESC';
    return await db.getAllAsync<HasilSO>(query, params);
  },

  getByNoAsset: async (no_asset: string): Promise<HasilSO | null> => {
    const db = await getDb();
    if (!db) return null;
    return await db.getFirstAsync<HasilSO>('SELECT * FROM hasil_so WHERE no_asset = ?', [no_asset]) || null;
  },

  getAllDepartemen: async (): Promise<string[]> => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.getAllAsync<{ departemen: string }>(
      "SELECT DISTINCT departemen FROM hasil_so WHERE departemen IS NOT NULL AND departemen != ''"
    );
    return rows.map(r => r.departemen);
  },

  getBelumSO: async (): Promise<HasilSO[]> => {
    const db = await getDb();
    if (!db) return [];
    return await db.getAllAsync<HasilSO>("SELECT * FROM hasil_so WHERE status_so = 'DRAFT' ORDER BY id DESC");
  },

  updateFoto: async (no_asset: string, foto_path: string) => {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hasil_so SET foto_path = ?, updated_at = ? WHERE no_asset = ?',
      [foto_path, now, no_asset]
    );
  },
};
