import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ProgressBar, Title, IconButton, ActivityIndicator } from 'react-native-paper';
import { useAppStore } from '../store/useAppStore';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService } from '../api/hasilSoService';
import * as DocumentPicker from 'expo-document-picker';
import { parseExcelFile } from '../api/excelService';
import { accountingService } from '../api/accountingService';

const DashboardScreen = ({ navigation }: any) => {
  const { soSession, stats, setStats } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await hasilSoService.getSummaryStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [setStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      setImporting(true);

      const parsed = await parseExcelFile(file.uri);
      if (parsed.length === 0) {
        Alert.alert('Perhatian', 'File tidak berisi data yang bisa dibaca.\nPastikan header kolom sesuai:\nNama Asset, Spesifikasi, Pembuat, Daya, dll.');
        return;
      }

      Alert.alert(
        'Konfirmasi Import',
        `Ditemukan ${parsed.length} data di file "${file.name}".\n\nData lama akan DITIMPA. Lanjutkan?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                const { imported, skipped } = await accountingService.importAccountingData(parsed);
                Alert.alert('✅ Import Berhasil', `${imported} data berhasil diimport.${skipped > 0 ? `\n${skipped} baris dilewati (nama kosong).` : ''}`);
                loadStats();
              } catch (err: any) {
                Alert.alert('Error', 'Gagal import: ' + err.message);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', 'Gagal membuka file: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Title style={styles.title}>Dashboard</Title>
          <Text variant="bodyMedium">Sesi: {soSession}</Text>
        </View>
        <IconButton icon="refresh" onPress={loadStats} disabled={refreshing} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Progress Stock Opname</Text>
          <ProgressBar progress={stats.progress / 100} color="#1565C0" style={styles.progress} />
          <View style={styles.statsRow}>
            <Text>{stats.sudahSO} / {stats.totalAccounting} Item</Text>
            <Text>{stats.progress}%</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.miniCard}>
          <Card.Content>
            <Text variant="labelSmall">Belum SO</Text>
            <Title style={{ color: '#d32f2f' }}>{stats.belumSO}</Title>
          </Card.Content>
        </Card>
        <Card style={styles.miniCard}>
          <Card.Content>
            <Text variant="labelSmall">Aset Baru</Text>
            <Title style={{ color: '#1565C0' }}>{stats.assetBaru}</Title>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.buttonGrid}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('SOList')}
          style={styles.button}
          icon="magnify"
        >
          Mulai Stock Opname
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Rekap')}
          style={styles.button}
          icon="chart-bar"
        >
          Rekap &amp; Export Excel
        </Button>

        {/* Import Data Referensi */}
        <Button
          mode="outlined"
          onPress={handleImportExcel}
          style={styles.importBtn}
          icon={importing ? undefined : 'file-import'}
          disabled={importing}
          textColor="#2E7D32"
        >
          {importing ? (
            <ActivityIndicator size="small" color="#2E7D32" />
          ) : (
            'Import Data Referensi (.xlsx)'
          )}
        </Button>
        <Text style={styles.importHint}>
          Upload file Excel dengan kolom: Nama Asset, Spesifikasi, Pembuat, Daya, Tahun Buat, Tahun Beli, Departemen, No Invoice, Catatan
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 15,
    elevation: 2,
    backgroundColor: '#fff',
  },
  miniCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    backgroundColor: '#fff',
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  progress: {
    height: 12,
    borderRadius: 6,
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonGrid: {
    gap: 12,
  },
  button: {
    paddingVertical: 4,
  },
  importBtn: {
    borderColor: '#2E7D32',
    borderWidth: 1.5,
    paddingVertical: 2,
    marginTop: 4,
  },
  importHint: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});

export default DashboardScreen;
