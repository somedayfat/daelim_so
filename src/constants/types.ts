// ============================================================
// V2: SO by Model/Tipe Mesin (Nama + Spesifikasi + QTY)
// ============================================================

export interface RefAccounting {
  id?: number;
  no_invoice?: string;
  nama_accounting: string;
  spesifikasi?: string;
  pembuat?: string;
  daya_kw?: string;
  tahun_buat?: string;
  tahun_beli?: string;
  departemen?: string;
  catatan_acc?: string;
  qty_accounting?: number;   // V2: total qty per tipe model dari accounting
  is_verified?: number;      // 0 or 1
}

export interface HasilSO {
  id?: number;
  no_so: string;               // V2: Kode Unik SO (misal: SO-0001)

  // Referensi ke tipe model
  ref_accounting_id?: number;
  nama_lapangan: string;       // nama aktual di lapangan
  nama_accounting?: string;    // nama dari master accounting

  // Detail mesin
  spesifikasi?: string;
  pembuat?: string;
  daya_kw?: string;
  tahun_buat?: string;
  tahun_beli?: string;
  departemen?: string;
  no_invoice?: string;

  // V2: QTY-based
  qty_accounting: number;      // target dari master accounting
  qty_aktual: number;          // hasil hitung di lapangan
  selisih?: number;            // qty_aktual - qty_accounting (computed)

  // Status
  // MATCH: qty_aktual == qty_accounting
  // KURANG: qty_aktual < qty_accounting
  // LEBIH: qty_aktual > qty_accounting
  // TIDAK_ADA: qty_aktual == 0
  // BARU: tidak ada di master accounting
  status_match: 'MATCH' | 'KURANG' | 'LEBIH' | 'TIDAK_ADA' | 'BARU';
  status_pengadaan?: 'Beli' | 'Buat Sendiri';
  status_so: 'DRAFT' | 'FINAL';

  // V2: Multiple foto (JSON array string, e.g. '["path1.jpg","path2.jpg"]')
  foto_paths?: string;
  // Helper getter (computed from foto_paths)
  _foto_list?: string[];

  catatan?: string;
  so_session?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper: parse foto_paths JSON string → string[]
export const parseFotoPaths = (foto_paths?: string): string[] => {
  if (!foto_paths) return [];
  try {
    const parsed = JSON.parse(foto_paths);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Legacy: single path string
    return foto_paths ? [foto_paths] : [];
  }
};

// Helper: stringify string[] → foto_paths JSON string
export const stringifyFotoPaths = (paths: string[]): string => {
  return JSON.stringify(paths.filter(p => !!p));
};

export const computeQtyStatus = (
  qtyAktual: number,
  qtyAccounting: number,
  hasRef: boolean
): HasilSO['status_match'] => {
  if (qtyAktual === 0) return 'TIDAK_ADA';
  if (qtyAktual === qtyAccounting) return 'MATCH';
  if (qtyAktual < qtyAccounting) return 'KURANG';
  return 'LEBIH';
};

export interface AppConfig {
  key: string;
  value: string;
}

export interface SODashboardStats {
  totalAccounting: number;   // total tipe model di master
  sudahSO: number;           // tipe yang sudah di-SO
  belumSO: number;           // tipe yang belum di-SO
  assetBaru: number;         // BARU (tidak di master)
  progress: number;          // persentase sudahSO / totalAccounting
  // QTY stats
  totalQtyAccounting: number;
  totalQtyAktual: number;
  selisihTotal: number;
}
