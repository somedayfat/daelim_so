import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, ActivityIndicator, Banner } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { parseExcelFile } from '../api/excelService';
import { accountingService } from '../api/accountingService';
import { RefAccounting } from '../constants/types';

const ImportScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RefAccounting[]>([]);
  const [fileUri, setFileUri] = useState<string | null>(null);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
      });

      if (!result.canceled) {
        setLoading(true);
        const uri = result.assets[0].uri;
        setFileUri(uri);
        const data = await parseExcelFile(uri);
        setPreviewData(data);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Gagal memilih file');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    Alert.alert(
      'Konfirmasi Import',
      'Data lama akan dihapus dan diganti dengan data baru. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Import',
          onPress: async () => {
            setLoading(true);
            try {
              const count = await accountingService.importAccountingData(previewData);
              setLoading(false);
              Alert.alert('Sukses', `Berhasil mengimport ${count} data accounting`, [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              setLoading(false);
              Alert.alert('Error', 'Gagal menyimpan data ke database');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Banner
        visible={true}
        actions={[{ label: 'Pilih File Excel', onPress: handlePickFile }]}
        icon="file-excel"
      >
        Pastikan file Excel memiliki kolom: Nama Accounting, No Invoice, Spesifikasi, dll.
      </Banner>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={{ marginTop: 10 }}>Memproses data...</Text>
        </View>
      )}

      {!loading && previewData.length > 0 && (
        <ScrollView style={styles.scroll}>
          <Title style={styles.previewTitle}>Preview (5 Baris Pertama):</Title>
          {previewData.slice(0, 5).map((item, index) => (
            <Card key={index} style={styles.card}>
              <Card.Content>
                <Text variant="labelLarge">{item.nama_accounting}</Text>
                <Text variant="bodySmall">Inv: {item.no_invoice} | Dept: {item.departemen}</Text>
              </Card.Content>
            </Card>
          ))}
          <Text style={styles.totalText}>Total ditemukan: {previewData.length} baris</Text>
        </ScrollView>
      )}

      {!loading && previewData.length > 0 && (
        <Button 
          mode="contained" 
          onPress={handleImport} 
          style={styles.importBtn}
          contentStyle={{ height: 50 }}
        >
          Import {previewData.length} Data Sekarang
        </Button>
      )}
    </View>
  );
};

const Title = Text; // Helper

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 15,
  },
  previewTitle: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  totalText: {
    textAlign: 'center',
    marginVertical: 15,
    fontStyle: 'italic',
  },
  importBtn: {
    margin: 15,
    backgroundColor: '#1565C0',
  }
});

export default ImportScreen;
