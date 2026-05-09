import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'asset_so.db';

export const getDb = async () => {
  if (Platform.OS === 'web') return null;
  return await SQLite.openDatabaseAsync(DATABASE_NAME);
};

export const initDatabase = async () => {
  if (Platform.OS === 'web') {
    console.log('Running on Web: Database features are disabled.');
    return;
  }
  
  const db = await getDb();
  if (!db) return;

  // 1. Table: ref_accounting
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

  // 2. Table: hasil_so
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

  // 3. Table: app_config
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_config (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insert default config if not exists
  const configExists = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM app_config');
  if (configExists && configExists.count === 0) {
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('so_session', 'SO-2024-001')");
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('company_name', 'PT. DAELIM')");
    await db.runAsync("INSERT INTO app_config (key, value) VALUES ('last_export', '')");
  }

  console.log('Database initialized successfully');
};
