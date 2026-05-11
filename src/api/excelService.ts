import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { RefAccounting, HasilSO, parseFotoPaths } from '../constants/types';

/**
 * Parse file Excel dari URI.
 * V2: Mendukung kolom QTY/Jumlah
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

    const findNum = (row: any, keys: string[]): number => {
      const val = findVal(row, keys);
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 1 : parsed;
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
        qty_accounting:  findNum(row, ['quantity', 'QTY', 'Qty', 'Jumlah', 'Total']),
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
 * Export hasil SO ke Excel V2 (Quantity Based)
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

  const allFotoUris: string[] = [];
  
  const wb = XLSX.utils.book_new();

  // === Sheet 1: Hasil SO ===
  const hasilFormatted = hasilSo.map(item => {
    const listFoto = parseFotoPaths(item.foto_paths);
    listFoto.forEach(p => allFotoUris.push(p));

    return {
      'No SO':            String(item.no_so || ''),
      'Nama Item':        String(item.nama_lapangan || ''),
      'Nama Accounting':  String(item.nama_accounting || ''),
      'Spesifikasi':      String(item.spesifikasi || ''),
      'QTY Accounting':   item.qty_accounting || 0,
      'QTY Aktual':       item.qty_aktual || 0,
      'Selisih':          item.selisih || 0,
      'Status':           String(item.status_match || ''),
      'Departemen':       String(item.departemen || ''),
      'Merk/Pembuat':     String(item.pembuat || ''),
      'Daya (KW)':        String(item.daya_kw || ''),
      'Thn Buat':         String(item.tahun_buat || ''),
      'Thn Beli':         String(item.tahun_beli || ''),
      'No Invoice':       String(item.no_invoice || ''),
      'Pengadaan':        String(item.status_pengadaan || ''),
      'Kondisi':          String(item.kondisi || ''),
      'Status SO':        String(item.status_so || ''),
      'Catatan':          String(item.catatan || ''),
      'Jumlah Foto':      listFoto.length,
      'Lokasi Foto':      listFoto.length > 0 ? 'Galeri HP → Album: Daelim SO' : '',
    };
  });

  const wsHasil = XLSX.utils.json_to_sheet(hasilFormatted);
  wsHasil['!cols'] = [
    {wch:15},{wch:25},{wch:25},{wch:20},{wch:12},
    {wch:12},{wch:12},{wch:15},{wch:15},{wch:18},
    {wch:12},{wch:12},{wch:12},{wch:18},{wch:15},
    {wch:12},{wch:12},{wch:20},{wch:12},{wch:25},
  ];
  XLSX.utils.book_append_sheet(wb, wsHasil, 'Hasil SO');

  // === Sheet 2: Belum di-SO ===
  const belumFormatted = belumSo.map(item => ({
    'Nama Accounting': String(item.nama_accounting || ''),
    'Spesifikasi':     String(item.spesifikasi || ''),
    'QTY Target':      item.qty_accounting || 0,
    'Pembuat':         String(item.pembuat || ''),
    'Departemen':      String(item.departemen || ''),
    'No Invoice':      String(item.no_invoice || ''),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(belumFormatted), 'Belum di-SO');

  // === Sheet 3: Summary ===
  const summaryRow = {
    ...summary,
    'Total Foto Diambil': allFotoUris.length,
    'Album Galeri': 'Daelim SO',
    'Tanggal Export': new Date().toLocaleString('id-ID'),
  };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([summaryRow]), 'Summary');

  // Tulis Excel
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const xlsxUri = exportDir + `Hasil_SO_Daelim_${dateStr}.xlsx`;
  await FileSystem.writeAsStringAsync(xlsxUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Share file Excel
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(xlsxUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Simpan File Excel Hasil SO',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return { xlsxUri, fotoCount: allFotoUris.length, fotoUris: allFotoUris };
};
