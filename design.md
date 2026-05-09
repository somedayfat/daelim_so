# 📱 Asset Stock Opname (SO) Application
## Design & Development Specification

---

## 📌 Project Overview

Aplikasi mobile Android untuk melakukan Stock Opname (SO) aset/mesin 
di perusahaan kawasan berikat. Aplikasi berjalan **OFFLINE** dengan 
penyimpanan lokal di perangkat, dan dapat mengekspor hasil ke format Excel.

**Tujuan Utama:**
- Melakukan SO fisik ±600 mesin di area produksi
- Mencocokkan data aset antara Accounting vs Lapangan
- Menghasilkan data aset final yang valid & terdokumentasi (dengan foto)
- Export hasil SO ke Excel untuk pelaporan BC (Bea Cukai)

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | React Native (Expo) |
| Database Lokal | SQLite (expo-sqlite) |
| Export Excel | xlsx (SheetJS) |
| Kamera/Foto | expo-camera / expo-image-picker |
| State Management | Zustand atau Context API |
| Target Platform | Android (min SDK 26 / Android 8+) |
| UI Style | React Native Paper (Material 3) |

> ⚠️ Aplikasi harus berjalan 100% OFFLINE
> Tidak ada koneksi internet / cloud yang dibutuhkan
> Semua data tersimpan di local storage HP

---

## 🗄️ Database Schema (SQLite)

### Tabel 1: `ref_accounting`
> Data referensi dari Accounting (di-import sekali di awal)

```sql
CREATE TABLE ref_accounting (
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
  is_verified     INTEGER DEFAULT 0  -- 0=belum SO, 1=sudah SO
);


Tabel 2: hasil_so
Data hasil Stock Opname lapangan (data final)

CREATE TABLE hasil_so (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  no_asset              TEXT UNIQUE,        -- generate otomatis: AST-0001
  nama_lapangan         TEXT NOT NULL,      -- nama mesin versi lapangan
  nama_accounting       TEXT,               -- nama versi accounting
  ref_accounting_id     INTEGER,            -- FK ke ref_accounting (nullable)
  spesifikasi           TEXT,
  pembuat               TEXT,
  daya_kw               TEXT,
  tahun_buat            TEXT,
  tahun_beli            TEXT,
  departemen            TEXT,
  no_invoice            TEXT,
  status_pengadaan      TEXT,               -- 'Beli' atau 'Buat Sendiri'
  foto_path             TEXT,               -- path foto lokal di HP
  catatan               TEXT,
  status_match          TEXT,               -- 'MATCH','BEDA_NAMA','BARU','TIDAK_ADA_FISIK'
  status_so             TEXT DEFAULT 'DRAFT', -- 'DRAFT' atau 'FINAL'
  created_at            TEXT,
  updated_at            TEXT,
  FOREIGN KEY (ref_accounting_id) REFERENCES ref_accounting(id)
);


Tabel 3: app_config
Konfigurasi aplikasi

CREATE TABLE app_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- Default data:
-- ('so_session', 'SO-2024-001')
-- ('company_name', 'PT. XXXX')
-- ('last_export', '')

Screen & Navigation Structure

App
├── 1. Splash Screen
├── 2. Home Dashboard
├── 3. Import Data Accounting        ← input data referensi awal
├── 4. Stock Opname (SO) Screen      ← MAIN SCREEN
│   ├── 4a. List SO (sudah & belum)
│   ├── 4b. Form SO - New Asset
│   └── 4c. Form SO - Edit Asset
├── 5. Data Referensi Accounting     ← view data accounting
├── 6. Rekap & Summary
└── 7. Export Excel

Screen Specifications

 1. Splash Screen
Tampilkan logo & nama aplikasi
Cek database, inisialisasi jika pertama kali
Auto navigate ke Home setelah 2 detik
2. Home Dashboard
Tampilkan:

Nama sesi SO (contoh: “SO Session: SO-2024-001”)
Progress SO:
Total Mesin di Accounting: XXX
Sudah di-SO: XXX
Belum di-SO: XXX
Asset Baru (tidak ada di accounting): XXX
Progress Bar visual
4 Menu Button:
[📥 Import Data Accounting]
[🔍 Stock Opname]
[📊 Rekap Data]
[📤 Export Excel]
3. Import Data Accounting
Fungsi: Membaca file Excel/CSV dari storage HP dan memasukkan ke tabel ref_accounting

Flow:

Tombol “Pilih File Excel/CSV”
File picker → pilih file dari storage
Preview data (tampilkan 5 baris pertama)
Mapping kolom:
Kolom mana = Nama Accounting?
Kolom mana = No Invoice?
dst…
Tombol “Import Sekarang”
Loading + progress bar
Tampilkan hasil: “Berhasil import XXX data”
Format file yang diterima: .xlsx, .xls, .csv

Catatan:

Jika import ulang → tampilkan warning “Data lama akan ditimpa, lanjutkan?”
Validasi: kolom nama_accounting tidak boleh kosong
4a. List SO Screen
Fitur:

Search bar (cari by nama lapangan / nama accounting / no asset)
Filter tab: Semua | Draft | Final | Belum di-SO
Filter by Departemen (dropdown)
List item menampilkan:
No Asset
Nama Lapangan
Departemen
Badge status:
🟢 MATCH
🟡 BEDA NAMA
🔵 BARU
🔴 TIDAK ADA FISIK
Badge SO: DRAFT / FINAL
FAB Button (+) → Form SO Baru
Tap item → Form SO Edit


┌─────────────────────────────────┐
│  [📷 Foto Mesin]                │
│  (tap untuk ambil foto)         │
├─────────────────────────────────┤
│  No Asset: AST-0001 (auto)      │
├─────────────────────────────────┤
│  SECTION: DATA LAPANGAN         │
│  Nama Mesin (Lapangan)*         │
│  [________________________]     │
│                                 │
│  Spesifikasi                    │
│  [________________________]     │
│                                 │
│  Pembuat/Merk                   │
│  [________________________]     │
│                                 │
│  Daya (Kw)                      │
│  [________________________]     │
│                                 │
│  Tahun Buat                     │
│  [________________________]     │
│                                 │
│  Tahun Beli                     │
│  [________________________]     │
│                                 │
│  Departemen*                    │
│  [Dropdown: list departemen]    │
│                                 │
│  No Invoice                     │
│  [________________________]     │
│                                 │
│  Pengadaan                      │
│  ◉ Beli  ○ Buat Sendiri         │
│                                 │
│  Catatan                        │
│  [________________________]     │
│  [________________________]     │
├─────────────────────────────────┤
│  SECTION: MAPPING ACCOUNTING    │
│                                 │
│  [🔗 Cari & Hubungkan ke Data   │
│      Accounting]                │
│                                 │
│  Jika sudah dipilih tampilkan:  │
│  ✅ Terhubung ke:               │
│  "[nama_accounting]"            │
│  Invoice: [no_invoice]          │
│  [❌ Hapus Mapping]             │
│                                 │
│  Status Match:                  │
│  ◉ MATCH (nama sama)            │
│  ○ BEDA NAMA (sudah dimapping)  │
│  ○ BARU (tidak ada di acc)      │
│  ○ TIDAK ADA FISIK              │
├─────────────────────────────────┤
│  [💾 Simpan Draft]              │
│  [✅ Simpan & Final]            │
└─────────────────────────────────┘

Logic Form:

No Asset → auto generate format AST-XXXX (increment)
Saat input Nama Mesin (Lapangan) → auto suggest dari data accounting (live search, minimum 3 karakter)
Tombol [🔗 Cari & Hubungkan] → buka bottom sheet pencarian data accounting
Jika dipilih dari accounting → auto-fill field yang kosong (spesifikasi, pembuat, daya, tahun beli, no invoice)
Field yang di-autofill bisa diedit manual
Simpan Draft → status_so = ‘DRAFT’
Simpan & Final → status_so = ‘FINAL’, tidak bisa diedit kecuali di-unlock

4d. Bottom Sheet: Cari Data Accounting

┌─────────────────────────────────┐
│  Cari Data Accounting           │
│  [🔍 ketik nama mesin...]       │
├─────────────────────────────────┤
│  Hasil pencarian:               │
│  ┌───────────────────────────┐  │
│  │ Nama: Conveyor Belt Type A│  │
│  │ Invoice: INV-2020-001     │  │
│  │ Tahun Beli: 2020          │  │
│  │ Status: ✅ Belum di-SO    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Nama: Conveyor Belt Type B│  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│  [+ Tidak ada di list, skip]    │
└─────────────────────────────────┘

Search realtime dari ref_accounting
Tampilkan badge “⚠️ Sudah di-SO” jika is_verified = 1
Pilih → kembali ke form, auto-fill data
5. Data Referensi Accounting
List semua data dari ref_accounting
Badge: ✅ Sudah di-SO / ⏳ Belum di-SO
Search & filter
Fitur penting: Tampilkan data accounting yang belum di-SO → untuk identifikasi mesin yang mungkin terlewat atau tidak ada fisiknya
6. Rekap & Summary Screen
Tampilkan:

📊 REKAP STOCK OPNAME
Sesi: SO-2024-001
Tanggal: XX/XX/XXXX

PROGRESS:
▓▓▓▓▓▓▓░░░ 65%

Total Data Accounting    : 580
Total Hasil SO           : 420
  ✅ MATCH               : 300
  ⚠️  BEDA NAMA          : 80
  🆕 BARU (tidak di acc) : 40
  ❌ TIDAK ADA FISIK     : 15
Belum di-SO              : 160

STATUS:
  Final                  : 350
  Draft (belum final)    : 70

Tombol → Export Excel

7. Export Excel Screen
Pilihan Export:

☑️ Export Hasil SO (data hasil_so)
☑️ Export Data Accounting (data ref_accounting)
☑️ Export Rekap Summary
☑️ Include foto? (Ya/Tidak) ← jika Ya, foto di-embed di Excel
Output Excel - Sheet 1: Hasil SO

NO ASSET	NAMA LAPANGAN	NAMA ACCOUNTING	SPESIFIKASI	PEMBUAT	DAYA (KW)	TAHUN BUAT	TAHUN BELI	DEPARTEMEN	NO INVOICE	PENGADAAN	STATUS MATCH	STATUS SO	CATATAN
Output Excel - Sheet 2: Belum di-SO

Data dari ref_accounting yang is_verified = 0

Output Excel - Sheet 3: Summary

Data rekap angka

File disimpan ke: /storage/emulated/0/Download/SO_Asset_[tanggal].xlsx Notifikasi: “File berhasil disimpan di folder Download”

⚙️ Business Logic & Rules
Auto Generate No Asset

Format: AST-XXXX
Contoh: AST-0001, AST-0002, ... AST-0600
Logic: ambil ID terakhir + 1, format dengan leading zero 4 digit

Status Match Logic

MATCH         → ref_accounting_id != null 
                DAN nama_lapangan == nama_accounting (case insensitive)

BEDA_NAMA     → ref_accounting_id != null 
                DAN nama_lapangan != nama_accounting

BARU          → ref_accounting_id == null

TIDAK_ADA_FISIK → data ada di ref_accounting tapi tidak ditemukan fisik
                  (input manual oleh user)


Update is_verified di ref_accounting    

Ketika hasil_so di-FINAL-kan dengan ref_accounting_id != null
→ UPDATE ref_accounting SET is_verified = 1 
  WHERE id = ref_accounting_id

Foto Handling

- Foto diambil via kamera HP
- Disimpan lokal di: /data/user/0/[app]/files/photos/[no_asset].jpg
- Kompres otomatis max 800px & quality 70% sebelum disimpan
- foto_path di database menyimpan path absolut


🎨 UI/UX Guidelines
Warna Utama: Biru (#1565C0) - kesan profesional & corporate
Font: Default Flutter (Roboto)
Status Badge Colors:
MATCH → Hijau
BEDA NAMA → Kuning/Amber
BARU → Biru
TIDAK ADA FISIK → Merah
Form: Gunakan Card per section agar tidak overwhelming
Tombol aksi utama: Full width di bagian bawah
Loading state: Tampilkan CircularProgressIndicator saat proses import/export
Empty state: Tampilkan ilustrasi + teks jika list kosong
Konfirmasi: Selalu tampilkan dialog konfirmasi sebelum aksi destructive

📦 React Native Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-sqlite": "~13.2.2",
    "expo-file-system": "~16.0.8",
    "expo-camera": "~14.1.1",
    "expo-image-picker": "~14.7.1",
    "expo-document-picker": "~11.10.1",
    "react-native-paper": "^5.12.3",
    "react-native-vector-icons": "^10.0.3",
    "xlsx": "^0.18.5",
    "zustand": "^4.5.1",
    "date-fns": "^3.3.1"
  }
}
```

Project Structure (React Native)

src/
├── api/              # Services (Excel, DB helpers)
├── components/       # Shared UI Widgets
├── constants/        # Colors, Styles, Config
├── hooks/            # Custom hooks (DB, state)
├── navigation/       # Screen routing
├── screens/          # Main Feature screens
└── store/            # State management (Zustand)


Development Notes untuk AI Developer
Prioritas utama: Aplikasi HARUS bisa jalan offline penuh
Import Excel: Gunakan package excel untuk baca file .xlsx
Foto: Selalu kompres sebelum simpan, jangan simpan foto original (menghemat storage HP)
No Asset: Generate di sisi aplikasi, bukan database auto-increment
Export: Simpan ke folder Download agar mudah diakses user
Permission: Handle permission storage & kamera dengan baik, tampilkan dialog penjelasan sebelum minta permission
Error handling: Semua operasi DB & file harus ada try-catch dengan pesan error yang user-friendly
Backup: Tambahkan fitur “Backup Database” → export file .db ke folder Download sebagai antisipasi HP rusak/hilang
Testing: Test dengan data dummy 600 rows untuk pastikan performa tidak lambat

Definition of Done
[ ] Semua screen terbangun sesuai spesifikasi
[ ] Import Excel/CSV berjalan dengan benar
[ ] Form SO bisa input data + foto
[ ] Auto-suggest dari data accounting berjalan
[ ] Export Excel menghasilkan file yang bisa dibuka
[ ] Aplikasi berjalan offline tanpa error
[ ] Tested dengan 600 data dummy
[ ] APK bisa di-install di Android

