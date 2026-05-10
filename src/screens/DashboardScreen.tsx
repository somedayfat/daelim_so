import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
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
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Title style={styles.title}>Daelim SO Apps</Title>
          <Text variant="bodyMedium">Sesi: {soSession}</Text>
        </View>
        <IconButton icon="refresh" onPress={loadStats} disabled={refreshing} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Progress Stock Opname</Text>
          <ProgressBar progress={stats.progress / 100} color="#1565C0" style={styles.progress} />
          <View style={styles.statsRow}>
            <Text>{stats.sudahSO} / {stats.totalAccounting} Tipe Item</Text>
            <Text>{stats.progress}%</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Statistik Kuantitas V2 */}
      <Card style={styles.cardQty}>
        <Card.Content>
          <Text variant="labelMedium" style={styles.qtyLabel}>Ringkasan Kuantitas (Unit)</Text>
          <View style={styles.qtyGrid}>
            <View style={styles.qtyItem}>
              <Text variant="labelSmall">Accounting</Text>
              <Text variant="titleMedium">{stats.totalQtyAccounting}</Text>
            </View>
            <View style={styles.qtyItem}>
              <Text variant="labelSmall">Aktual</Text>
              <Text variant="titleMedium" style={{ color: '#1565C0' }}>{stats.totalQtyAktual}</Text>
            </View>
            <View style={styles.qtyItem}>
              <Text variant="labelSmall">Selisih</Text>
              <Text variant="titleMedium" style={{ color: stats.selisihTotal < 0 ? '#d32f2f' : '#2e7d32' }}>
                {stats.selisihTotal > 0 ? `+${stats.selisihTotal}` : stats.selisihTotal}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.miniCard}>
          <Card.Content style={{ alignItems: 'center' }}>
            <Text variant="labelSmall">Belum SO</Text>
            <Title style={{ color: '#d32f2f' }}>{stats.belumSO}</Title>
            <Text variant="labelSmall">Tipe Item</Text>
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
    lineHeight: 24,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  card: {
    marginBottom: 10,
    elevation: 2,
    backgroundColor: '#fff',
  },
  cardQty: {
    marginBottom: 15,
    elevation: 2,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
  },
  qtyLabel: {
    marginBottom: 8,
    color: '#757575',
  },
  qtyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qtyItem: {
    alignItems: 'center',
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
