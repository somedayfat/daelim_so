# 🗺️ Development Roadmap: Asset Stock Opname (SO)

Dokumen ini berisi tahapan pengerjaan aplikasi SO Asset berbasis React Native (Expo) sesuai dengan spesifikasi di [design.md](file:///c:/Users/ohemood/Documents/daelim_so/design.md).

---

## 📅 Timeline & Task List

### 🟦 Phase 1: Project Setup & Foundation
*Goal: Menyiapkan struktur proyek dan dependensi.*
- [x] Initialize Flutter Project (Material 3). -> Migrated to React Native (Expo)
- [x] Setup `package.json` (sqlite, xlsx, zustand, etc.).
- [x] Create Directory Structure (`src/api`, `src/screens`, etc.).
- [x] Define Design System (Material 3 with React Native Paper).

### 🟦 Phase 2: Core Data Layer (Database)
*Goal: Menyiapkan penyimpanan lokal.*
- [x] SQLite Database Helper Implementation (expo-sqlite).
- [x] Define Tables: `ref_accounting`, `hasil_so`, `app_config`.
- [x] Create Models / Types (`RefAccounting`, `HasilSO`).
- [ ] Logic Auto-generate `No Asset` (AST-XXXX).

### 🟦 Phase 3: Dashboard & Import Logic
*Goal: Menyiapkan data awal untuk aplikasi.*
- [x] Splash Screen & Initialization (Database & Theme).
- [x] Dashboard UI (Real Stats & Progress Bar).
- [x] **Import Screen**: Excel Picker & Parser.
- [x] Logic mapping kolom Excel ke Database.

### 🟦 Phase 4: Stock Opname Features (Core)
*Goal: Fitur utama pengerjaan SO.*
- [x] **SO List**: Search, Filter Tabs, and Status Badges.
- [x] **SO Form**:
    - [x] Section Data Lapangan.
    - [x] Section Mapping Accounting (Bottom Sheet Search).
    - [x] Camera Integration (Image Picker + Compression).
- [x] Auto-fill & Suggestion Logic.
- [x] Finalize & Unlock Logic.

### 🟦 Phase 5: Export & Reporting
*Goal: Mengeluarkan data hasil SO.*
- [x] **Rekap & Summary Screen** UI.
- [x] **Export Engine**: Generate .xlsx with multi-sheets.
- [x] Permission Handling (Expo Sharing & FileSystem).
- [x] Feature "Backup Database" (.db file export).

### 🟦 Phase 6: Testing & Optimization
*Goal: Memastikan aplikasi stabil.*
- [x] Error Handling & User-friendly Dialogs.
- [x] Performance test with 600+ records (Logic optimized with transactions).
- [x] UI Polishing & Empty State Illustrations.
- [x] Project Ready for APK Generation.

### 🟦 Phase 7: Maintenance & V2.1 Final Enhancements
*Goal: Optimasi alur kerja lapangan (Quantity-based & Simplifikasi).*
- [x] **Dual-Naming Support**: Integrasi Nama Maintenance vs Nama Accounting.
- [x] **Quantity-based Logic**: SO berbasis jumlah unit (bukan satu-satu).
- [x] **Simplified Flow**: Penghapusan field Invoice & Buying Date untuk kecepatan input.
- [x] **Master Data Sugestion**: Penambahan 50+ list departemen sebagai saran otomatis.
- [x] **Universal Excel Header**: Support format minimalis (Fixed Asset, Type, Maker, Unit, Nama Maint).
- [x] **Build & Deployment**: Migrasi EAS Account & Sukses Build APK V2.1-Final.

---

## 🛠️ Current Progress
- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5
- [x] Phase 6
- [x] Phase 7

---

> **Note:** Roadmap ini akan diupdate setiap kali satu fase selesai.
