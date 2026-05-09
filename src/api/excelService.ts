import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { RefAccounting, HasilSO } from '../constants/types';

export const parseExcelFile = async (uri: string): Promise<RefAccounting[]> => {
  try {
    const fileBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const workbook = XLSX.read(fileBase64, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName]; n
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      throw new Error('File Excel kosong atau tidak terbaca');
    }

    return jsonData.map((row: any) => {
      const findVal = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k =>
          keys.some(search => k.toLowerCase().trim() === search.toLowerCase().trim())
        );
        return foundKey ? String(row[foundKey]) : '';
      };

      return {
        // Menyesuaikan persis dengan gambar kawan
        no_invoice: findVal(['No Invoice', 'invoice', 'no_invoice']),
        nama_accounting: findVal(['Nama Asset', 'Nama Accounting', 'Description', 'Nama Mesin']),
        spesifikasi: findVal(['Spesifikasi/Standar', 'Spesifikasi', 'Spec', 'Standar']),
        pembuat: findVal(['Pembuat', 'Merk', 'Brand', 'Maker']),
        daya_kw: findVal(['Daya (Kw)', 'Daya', 'Kw', 'Power']),
        tahun_buat: findVal(['Tahun Buat', 'Thn Buat']),
        tahun_beli: findVal(['Tahun Beli', 'Thn Beli']),
        departemen: findVal(['Departemen', 'Dept', 'Location']),
        catatan_acc: findVal(['Catatan', 'Remarks', 'Keterangan']),
        is_verified: 0,
      };
    });
  } catch (error: any) {
    console.error('Excel Parsing Error:', error);
    throw new Error('Gagal membaca Excel: ' + error.message);
  }
};

export const exportToExcel = async (
  hasilSo: HasilSO[],
  belumSo: RefAccounting[],
  summary: any
) => {
  try {
    const wb = XLSX.utils.book_new();

    const wsHasil = XLSX.utils.json_to_sheet(hasilSo);
    XLSX.utils.book_append_sheet(wb, wsHasil, "Hasil SO");

    const wsBelum = XLSX.utils.json_to_sheet(belumSo);
    XLSX.utils.book_append_sheet(wb, wsBelum, "Belum di-SO");

    const wsSummary = XLSX.utils.json_to_sheet([summary]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `SO_Asset_${new Date().getTime()}.xlsx`;

    const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
    const fileUri = cacheDir + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: 'base64',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Simpan Hasil SO',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  } catch (error: any) {
    console.error('Export Error:', error);
    throw new Error('Gagal mengekspor data: ' + error.message);
  }
};
