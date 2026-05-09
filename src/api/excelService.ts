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
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    return jsonData.map((row) => ({
      no_invoice: String(row['No Invoice'] || row['no_invoice'] || ''),
      nama_accounting: String(row['Nama Accounting'] || row['nama_accounting'] || row['Description'] || ''),
      spesifikasi: String(row['Spesifikasi'] || row['spec'] || ''),
      pembuat: String(row['Pembuat'] || row['Maker'] || ''),
      daya_kw: String(row['Daya'] || row['KW'] || ''),
      tahun_buat: String(row['Tahun Buat'] || ''),
      tahun_beli: String(row['Tahun Beli'] || ''),
      departemen: String(row['Departemen'] || row['Dept'] || ''),
      catatan_acc: String(row['Catatan'] || ''),
      is_verified: 0,
    }));
  } catch (error) {
    console.error('Excel Parsing Error:', error);
    throw new Error('Gagal membaca file Excel');
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
    const fileUri = ((FileSystem as any).cacheDirectory || '') + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: 'base64',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Simpan Hasil SO',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      throw new Error('Fitur sharing tidak tersedia');
    }
  } catch (error) {
    console.error('Export Error:', error);
    throw new Error('Gagal mengekspor file Excel');
  }
};
