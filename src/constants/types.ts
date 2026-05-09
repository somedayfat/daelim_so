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
  is_verified?: number; // 0 or 1
}

export interface HasilSO {
  id?: number;
  no_asset: string; // AST-XXXX
  nama_lapangan: string;
  nama_accounting?: string;
  ref_accounting_id?: number;
  spesifikasi?: string;
  pembuat?: string;
  daya_kw?: string;
  tahun_buat?: string;
  tahun_beli?: string;
  departemen?: string;
  no_invoice?: string;
  status_pengadaan?: 'Beli' | 'Buat Sendiri';
  foto_path?: string;
  catatan?: string;
  status_match: 'MATCH' | 'BEDA_NAMA' | 'BARU' | 'TIDAK_ADA_FISIK';
  status_so: 'DRAFT' | 'FINAL';
  created_at?: string;
  updated_at?: string;
}

export interface AppConfig {
  key: string;
  value: string;
}

export interface SODashboardStats {
  totalAccounting: number;
  sudahSO: number;
  belumSO: number;
  assetBaru: number;
  progress: number;
}
