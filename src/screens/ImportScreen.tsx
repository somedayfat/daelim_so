import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, Title, ActivityIndicator, Divider } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { parseExcelFile } from '../api/excelService';
import { accountingService } from '../api/accountingService';
import { RefAccounting } from '../constants/types';

const ImportScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RefAccounting[]>([]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      });

      if (!result.canceled) {
        setLoading(true);
        const data = await parseExcelFile(result.assets[0].uri);
        setPreviewData(data);
        setLoading(false);
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'Gagal membaca file: ' + error.message);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    const hasExisting = await accountingService.hasData();

    if (hasExisting) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Peringatan',
          'Data lama akan ditimpa. Semua data accounting yang sudah ada akan dihapus. Lanjutkan?',
          [
            { text: 'Batal', style: 'cancel', onPress: () => resolve() },
            { text: 'Ya, Timpa Data', style: 'destructive', onPress: () => resolve(doImport()) }
          ]
        );
      });
    }

    await doImport();
  };

  const doImport = async () => {
    setLoading(true);
    try {
      const result = await accountingService.importAccountingData(previewData);
      setLoading(false);
      const msg = `Berhasil import ${result.imported} data.`;
      const extra = result.skipped > 0 ? `\n${result.skipped} baris dilewati (nama kosong).` : '';
      Alert.alert('Sukses', msg + extra, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'Gagal menyimpan data ke database: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Import Data Accounting</Title>
          <Text variant="bodySmall" style={{ marginBottom: 4 }}>
            Pilih file Excel (.xlsx) atau CSV yang berisi daftar aset perusahaan.
          </Text>
          <Text variant="bodySmall" style={{ marginBottom: 15, color: '#d32f2f' }}>
            Format kolom: Nama Asset, Spesifikasi/Standar, Pembuat, Daya (Kw), No Invoice, Tahun Buat, Tahun Beli, Departemen, Catatan
          </Text>
          <Button
            mode="contained"
            icon="file-upload"
            onPress={handlePickFile}
            loading={loading}
            disabled={loading}
          >
            Pilih File Excel
          </Button>
        </Card.Content>
      </Card>

      {previewData.length > 0 && (
        <View style={{ flex: 1 }}>
          <Text style={styles.previewTitle}>Pratinjau Data ({previewData.length} baris)</Text>
          <ScrollView style={styles.list}>
            {previewData.slice(0, 20).map((item, index) => (
              <List.Item
                key={index}
                title={item.nama_accounting}
                description={`Inv: ${item.no_invoice || '-'} | Dept: ${item.departemen || '-'} | Daya: ${item.daya_kw || '-'}`}
                left={props => <List.Icon {...props} icon="database" />}
              />
            ))}
            {previewData.length > 20 && (
              <Text style={{ textAlign: 'center', padding: 10, color: '#757575' }}>
                ... dan {previewData.length - 20} data lainnya
              </Text>
            )}
          </ScrollView>

          <Divider />
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleImport}
              style={styles.importBtn}
              loading={loading}
              disabled={loading}
            >
              KONFIRMASI IMPORT SEMUA
            </Button>
          </View>
        </View>
      )}

      {loading && previewData.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={{ marginTop: 10 }}>Memproses file...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 15,
    elevation: 4,
  },
  previewTitle: {
    marginHorizontal: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  importBtn: {
    backgroundColor: '#2E7D32',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default ImportScreen;
