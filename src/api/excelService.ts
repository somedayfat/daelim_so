import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { RefAccounting, HasilSO } from '../constants/types';

/**
 * Parse file Excel dari URI.
 * Header database.xlsx: No Asset, Nama Asset, Spesifikasi, Pembuat,
 * Daya, Tahun Buat, Tahun Beli, Departemen, No Invoice, Photo, Catatan
 */
export const parseExcelFile = async (uri: string): Promise<RefAccounting[]> => {
  try {
    const fileBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const workbook = XLSX.read(fileBase64, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) throw new Error('File Excel kosong atau tidak terbaca');

    const findVal = (row: any, keys: string[]): string => {
      const foundKey = Object.keys(row).find(k =>
        keys.some(s => k.toLowerCase().trim() === s.toLowerCase().trim())
      );
      if (!foundKey) return '';
      const val = row[foundKey];
      return val === null || val === undefined ? '' : String(val).trim();
    };

    return jsonData
      .map((row: any) => ({
        no_invoice:      findVal(row, ['No Invoice', 'no_invoice', 'Invoice', 'No. Invoice']),
        nama_accounting: findVal(row, ['Nama Asset', 'Nama Accounting', 'Nama Mesin', 'Description']),
        spesifikasi:     findVal(row, ['Spesifikasi', 'Spec', 'Standar']),
        pembuat:         findVal(row, ['Pembuat', 'Merk', 'Brand', 'Maker']),
        daya_kw:         findVal(row, ['Daya', 'Daya (Kw)', 'Kw', 'Power']),
        tahun_buat:      findVal(row, ['Tahun Buat', 'Thn Buat']),
        tahun_beli:      findVal(row, ['Tahun Beli', 'Thn Beli']),
        departemen:      findVal(row, ['Departemen', 'Dept', 'Location']),
        catatan_acc:     findVal(row, ['Catatan', 'Remarks', 'Keterangan']),
        is_verified:     0,
      } as RefAccounting))
      .filter(item => item.nama_accounting && item.nama_accounting.length > 0);
  } catch (error: any) {
    throw new Error('Gagal membaca Excel: ' + error.message);
  }
};

export const loadBundledExcel = async (): Promise<RefAccounting[]> => {
  const asset = Asset.fromModule(require('../../assets/database.xlsx'));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Gagal memuat file Excel bawaan');
  return await parseExcelFile(asset.localUri);
};

/**
 * Export hasil SO ke Excel.
 *
 * STRATEGI FOTO:
 * - Foto sudah tersimpan di Galeri HP (album "Stock Opname SO") saat diambil
 * - Di Excel, kolom "Nama File Foto" berisi nama file (misal: AST-0001_1234567890.jpg)
 * - Setelah export, ada opsi share foto satu per satu via Android Share Sheet
 *
 * Tidak ada "folder di samping Excel" — folder cache tidak bisa dibuka user.
 */
export const exportToExcel = async (
  hasilSo: HasilSO[],
  belumSo: RefAccounting[],
  summary: any
): Promise<{ xlsxUri: string; fotoCount: number; fotoUris: string[] }> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const exportDir = baseDir + `SO_Export_${dateStr}/`;

  await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });

  // Kumpulkan path foto yang valid
  const fotoUris: string[] = [];
  for (const item of hasilSo) {
    if (!item.foto_path) continue;
    try {
      const info = await FileSystem.getInfoAsync(item.foto_path);
      if (info.exists) fotoUris.push(item.foto_path);
    } catch (_) {}
  }

  const wb = XLSX.utils.book_new();

  // === Sheet 1: Hasil SO ===
  const hasilFormatted = hasilSo.map(item => {
    // Ambil nama file dari path foto (bukan full path)
    let namaFileFoto = '';
    if (item.foto_path) {
      const parts = item.foto_path.split('/');
      namaFileFoto = parts[parts.length - 1] || '';
    }
    return {
      'No Asset':         String(item.no_asset || ''),
      'Nama Lapangan':    String(item.nama_lapangan || ''),
      'Nama Accounting':  String(item.nama_accounting || ''),
      'Spesifikasi':      String(item.spesifikasi || ''),
      'Pembuat/Merk':     String(item.pembuat || ''),
      'Daya (Kw)':        String(item.daya_kw || ''),
      'Tahun Buat':       String(item.tahun_buat || ''),
      'Tahun Beli':       String(item.tahun_beli || ''),
      'Departemen':       String(item.departemen || ''),
      'No Invoice':       String(item.no_invoice || ''),
      'Status Pengadaan': String(item.status_pengadaan || ''),
      'Status Match':     String(item.status_match || ''),
      'Status SO':        String(item.status_so || ''),
      'Catatan':          String(item.catatan || ''),
      'Ada Foto':         item.foto_path ? 'YA' : 'TIDAK',
      'Nama File Foto':   namaFileFoto,
      // Petunjuk mencari foto
      'Lokasi Foto':      namaFileFoto ? 'Galeri HP → Album: Stock Opname SO' : '',
    };
  });

  const wsHasil = XLSX.utils.json_to_sheet(hasilFormatted);
  wsHasil['!cols'] = [
    {wch:10},{wch:28},{wch:28},{wch:18},{wch:14},
    {wch:10},{wch:12},{wch:12},{wch:14},{wch:18},
    {wch:15},{wch:14},{wch:10},{wch:25},{wch:8},
    {wch:30},{wch:30},
  ];
  XLSX.utils.book_append_sheet(wb, wsHasil, 'Hasil SO');

  // === Sheet 2: Belum di-SO ===
  const belumFormatted = belumSo.map(item => ({
    'Nama Accounting': String(item.nama_accounting || ''),
    'Spesifikasi':     String(item.spesifikasi || ''),
    'Pembuat':         String(item.pembuat || ''),
    'Daya (Kw)':       String(item.daya_kw || ''),
    'Tahun Beli':      String(item.tahun_beli || ''),
    'Departemen':      String(item.departemen || ''),
    'No Invoice':      String(item.no_invoice || ''),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(belumFormatted), 'Belum di-SO');

  // === Sheet 3: Summary ===
  const summaryRow = {
    ...summary,
    'Total Foto Ada': fotoUris.length,
    'Lokasi Foto': 'Galeri HP → Album: Stock Opname SO',
    'Tanggal Export': new Date().toLocaleString('id-ID'),
  };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([summaryRow]), 'Summary');

  // Tulis Excel
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const xlsxUri = exportDir + `SO_Asset_${dateStr}.xlsx`;
  await FileSystem.writeAsStringAsync(xlsxUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Share file Excel via Android share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(xlsxUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Simpan File Excel Hasil SO',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return { xlsxUri, fotoCount: fotoUris.length, fotoUris };
};

/**
 * Share semua foto satu per satu via Android Share Sheet.
 * Dipanggil dari RekapScreen setelah export Excel.
 */
export const shareAllPhotos = async (fotoUris: string[]): Promise<void> => {
  if (fotoUris.length === 0) return;

  for (let i = 0; i < fotoUris.length; i++) {
    const uri = fotoUris[i];
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Simpan Foto ${i + 1} dari ${fotoUris.length}`,
        });
      }
    } catch (err) {
      console.warn('[shareAllPhotos] Gagal share foto:', uri, err);
    }
  }
};
