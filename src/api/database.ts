import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { loadBundledExcel } from './excelService';
import { RefAccounting } from '../constants/types';

const DATABASE_NAME = 'asset_so.db';

// Singleton: satu koneksi untuk seluruh app, cegah data tidak konsisten antar module
let _db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase | null> => {
  if (Platform.OS === 'web') return null;
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    console.log('[DB] Opened singleton connection to', DATABASE_NAME);
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
        'INSERT INTO ref_accounting (no_invoice, nama_accounting, spesifikasi, pembuat, daya_kw, tahun_buat, tahun_beli, departemen, catatan_acc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
  });
};

export const initDatabase = async () => {
  if (Platform.OS === 'web') {
    console.log('Running on Web: Database features are disabled.');
    return;
  }

  const db = await getDb();
  if (!db) return;

  // --- Tabel ref_accounting ---
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
      is_verified     INTEGER DEFAULT 0
    );
  `);

  // --- Tabel hasil_so ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hasil_so (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      no_asset              TEXT UNIQUE,
      nama_lapangan         TEXT NOT NULL,
      nama_accounting       TEXT,
      ref_accounting_id     INTEGER,
      spesifikasi           TEXT,
      pembuat               TEXT,
      daya_kw               TEXT,
      tahun_buat            TEXT,
      tahun_beli            TEXT,
      departemen            TEXT,
      no_invoice            TEXT,
      status_pengadaan      TEXT,
      foto_path             TEXT,
      catatan               TEXT,
      status_match          TEXT,
      status_so             TEXT DEFAULT 'DRAFT',
      created_at            TEXT,
      updated_at            TEXT,
      FOREIGN KEY (ref_accounting_id) REFERENCES ref_accounting(id)
    );
  `);

  // --- MIGRATION: tambah kolom nama_accounting jika belum ada ---
  try {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(hasil_so)');
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('nama_accounting')) {
      await db.execAsync('ALTER TABLE hasil_so ADD COLUMN nama_accounting TEXT');
      console.log('[Migration] Added column nama_accounting to hasil_so');
    }
  } catch (e) {
    console.warn('[Migration] Could not check/alter hasil_so columns:', e);
  }

  // --- Tabel asset_photos (multi-foto per mesin) ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS asset_photos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      no_asset    TEXT NOT NULL,
      foto_path   TEXT NOT NULL,
      urutan      INTEGER DEFAULT 0,
      created_at  TEXT
    );
  `);

  // --- Tabel app_config ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const configExists = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM app_config');
  if (configExists && configExists.count === 0) {
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('so_session', 'SO-2024-001')");
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('company_name', 'PT. DAELIM')");
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('last_export', '')");
  }

  // --- Load bundled Excel database.xlsx jika ref_accounting masih kosong ---
  const accCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ref_accounting');
  if (!accCount || accCount.count === 0) {
    try {
      const bundledData = await loadBundledExcel();
      if (bundledData.length > 0) {
        await importAccountingDataDirect(bundledData);
        console.log(`Loaded ${bundledData.length} rows from bundled database.xlsx`);
      }
    } catch (e) {
      console.warn('Could not load bundled Excel, starting with empty data:', e);
    }
  }

  console.log('Database initialized successfully');
};
