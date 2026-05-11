import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { loadBundledExcel } from './excelService';
import { RefAccounting } from '../constants/types';

const DATABASE_NAME = 'asset_so.db';
const DB_VERSION = 2; // V2: Quantity-based SO

// Singleton: satu koneksi untuk seluruh app
let _db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase | null> => {
  if (Platform.OS === 'web') return null;
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    console.log('[DB] Opened singleton connection to', DATABASE_NAME, 'Version:', DB_VERSION);
  }
  return _db;
};

const importAccountingDataDirect = async (data: RefAccounting[]) => {
  const db = await getDb();
  if (!db) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM ref_accounting');

    for (const item of data) {
      if (!item.nama_accounting) continue;
      await db.runAsync(
        `INSERT INTO ref_accounting (
          no_invoice, nama_accounting, spesifikasi, pembuat, 
          daya_kw, tahun_buat, tahun_beli, departemen, catatan_acc, qty_accounting
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.no_invoice || '',
          item.nama_accounting,
          item.spesifikasi || '',
          item.pembuat || '',
          item.daya_kw || '',
          item.tahun_buat || '',
          item.tahun_beli || '',
          item.departemen || '',
          item.catatan_acc || '',
          item.qty_accounting || 1
        ]
      );
    }
  });
};

export const initDatabase = async () => {
  if (Platform.OS === 'web') return;

  const db = await getDb();
  if (!db) return;

  // 1. Cek Versi Database untuk Migrasi
  await db.execAsync(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);`);
  const versionRow = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = "db_version"');
  const currentVersion = versionRow ? parseInt(versionRow.value) : 1;

  console.log('[DB] Current Database Version:', currentVersion);

  // 2. Definisi Tabel V2
  
  // Tabel Master Data (Ref)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ref_accounting (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      no_invoice      TEXT,
      nama_accounting TEXT NOT NULL,
      spesifikasi     TEXT,
      pembuat         TEXT,
      daya_kw         TEXT,
      tahun_buat      TEXT,
      tahun_beli      TEXT,
      departemen      TEXT,
      catatan_acc     TEXT,
      qty_accounting  INTEGER DEFAULT 1,
      is_verified     INTEGER DEFAULT 0
    );
  `);

  // Tabel Hasil SO (V2 - Quantity Based)
  const CREATE_HASIL_SO_V2 = `
    CREATE TABLE IF NOT EXISTS hasil_so (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      no_so                 TEXT,
      ref_accounting_id     INTEGER,
      nama_lapangan         TEXT NOT NULL,
      nama_accounting       TEXT,
      spesifikasi           TEXT,
      pembuat               TEXT,
      daya_kw               TEXT,
      tahun_buat            TEXT,
      tahun_beli            TEXT,
      departemen            TEXT,
      no_invoice            TEXT,
      qty_accounting        INTEGER DEFAULT 1,
      qty_aktual            INTEGER DEFAULT 0,
      selisih               INTEGER DEFAULT 0,
      status_pengadaan      TEXT,
      kondisi               TEXT,
      foto_paths            TEXT DEFAULT '[]', -- JSON Array
      catatan               TEXT,
      status_match          TEXT,
      status_so             TEXT DEFAULT 'DRAFT',
      so_session            TEXT,
      created_at            TEXT,
      updated_at            TEXT,
      FOREIGN KEY (ref_accounting_id) REFERENCES ref_accounting(id)
    );
  `;

  // 3. Eksekusi Migrasi jika diperlukan
  if (currentVersion < 2) {
    console.log('[DB] Migrating database to V2...');
    
    // Tambah kolom qty_accounting ke ref_accounting jika belum ada
    try {
      await db.execAsync('ALTER TABLE ref_accounting ADD COLUMN qty_accounting INTEGER DEFAULT 1;');
    } catch (e) { /* kolom mungkin sudah ada */ }

    // Drop hasil_so lama (Breaking Change V2) dan buat baru
    await db.execAsync('DROP TABLE IF EXISTS hasil_so;');
    await db.execAsync(CREATE_HASIL_SO_V2);
    
    // Update versi ke meta
    await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES ("db_version", "2")');
    console.log('[DB] Migration to V2 complete.');
  } else {
    await db.execAsync(CREATE_HASIL_SO_V2);
    // Migration: Pastikan kolom no_so ada (V2.1)
    try {
      await db.execAsync("ALTER TABLE hasil_so ADD COLUMN no_so TEXT;");
      console.log("[DB] Migration: Added no_so column to existing table");
    } catch (e) { }

    try {
      await db.execAsync("ALTER TABLE hasil_so ADD COLUMN kondisi TEXT;");
      console.log("[DB] Migration: Added kondisi column");
    } catch (e) { }
  }

  // Tabel config
  await db.execAsync(`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT);`);
  const configExists = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM app_config');
  if (configExists && configExists.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    await db.runAsync(`INSERT INTO app_config (key, value) VALUES ('so_session', 'SO-${today}')`);
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('company_name', 'PT. DAELIM')");
  }

  // Auto-load bundled excel jika kosong
  const accCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
  if (!accCount || accCount.count === 0) {
    try {
      const bundledData = await loadBundledExcel();
      if (bundledData.length > 0) {
        await importAccountingDataDirect(bundledData);
      }
    } catch (e) {
      console.warn('Could not load bundled Excel:', e);
    }
  }

  console.log('[DB] Database initialized successfully');
};
