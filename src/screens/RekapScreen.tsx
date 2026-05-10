import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Title, Card, Button, Divider, List, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService, RekapDetailStats } from '../api/hasilSoService';
import { accountingService } from '../api/accountingService';
import { getDb } from '../api/database';
import { exportToExcel } from '../api/excelService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../store/useAppStore';

const RekapScreen = () => {
  const { soSession } = useAppStore();
  const [stats, setStats] = useState<RekapDetailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await hasilSoService.getDetailedStats();
      setStats(data);
    } catch (e: any) {
      console.error('Load stats error:', e);
      setError('Gagal memuat data: ' + (e?.message || 'Unknown error'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleExport = async () => {
    if (!stats) return;
    setLoading(true);
    try {
      const hasilSo = await hasilSoService.getAllHasil('', 'Semua');
      const belumSo = await accountingService.getUnverified();

      const summaryData = {
        'Sesi SO': soSession,
        'Total Unit (Accounting)': stats.totalAccounting,
        'Total Tipe Item': stats.totalTipe,
        'Tipe Sudah di-SO': stats.sudahSO,
        'MATCH (Qty Pas)': stats.matchCount,
        'KURANG (Unit Hilang)': stats.bedaNamaCount,
        'LEBIH (Aset Berlebih)': stats.lebihCount,
        'TIDAK ADA FISIK (0)': stats.tidakAdaFisikCount,
        'Belum di-SO': stats.belumSO,
        'Final': stats.finalCount,
        'Draft': stats.draftCount,
        'Progress (%)': stats.progress
      };

      const result = await exportToExcel(hasilSo, belumSo, summaryData);

      if (result.fotoCount > 0 || result.xlsxUri) {
        Alert.alert(
          '✅ Export Berhasil',
          `File Excel berhasil dibuat.\n\n📷 ${result.fotoCount} foto tersedia di Galeri HP, album "Daelim SO".`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengekspor data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const dbPath = FileSystem.documentDirectory + 'SQLite/asset_so.db';
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      if (!dbInfo.exists) {
        Alert.alert('Error', 'File database tidak ditemukan');
        setLoading(false);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dbPath, {
          dialogTitle: 'Backup Database',
          mimeType: 'application/x-sqlite3',
        });
      } else {
        Alert.alert('Error', 'Fitur sharing tidak tersedia di perangkat ini');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mem-backup database: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = () => {
    Alert.alert(
      '⚠ RESET SEMUA DATA',
      'Seluruh hasil Stock Opname akan DIHAPUS PERMANEN. Data master (Excel) tetap aman. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'YA, RESET SEMUA', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const db = await getDb();
              if (db) {
                await db.runAsync('DELETE FROM hasil_so');
                await db.runAsync('UPDATE ref_accounting SET is_verified = 0');
                Alert.alert('Sukses', 'Semua hasil SO telah dihapus.');
                loadData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#F44336', marginBottom: 10 }}>{error}</Text>
        <Button mode="outlined" onPress={loadData}>Coba Lagi</Button>
      </View>
    );
  }

  if (!stats) return <ActivityIndicator style={styles.center} color="#1565C0" />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>RINGKASAN STOCK OPNAME</Title>
          <Text variant="bodySmall" style={{ textAlign: 'center' }}>Sesi: {soSession}</Text>
          <Divider style={styles.divider} />

          <View style={styles.progressRow}>
            <Text variant="titleLarge">Progress:</Text>
            <Text variant="displaySmall" style={{ color: '#1565C0', fontWeight: 'bold' }}>{stats.progress}%</Text>
          </View>
          <ProgressBar progress={stats.progress / 100} color="#1565C0" style={styles.progressBar} />

          <Divider style={styles.divider} />
          <List.Item title="Total Unit (Accounting)" right={() => <Text variant="titleMedium">{stats.totalAccounting} Unit</Text>} />
          <List.Item 
            title="Total Unit (Aktual)" 
            right={() => <Text variant="titleMedium" style={{ color: '#1565C0' }}>{stats.totalAktual} Unit</Text>} 
          />
          <List.Item 
            title="Total Selisih" 
            right={() => (
              <Text variant="titleMedium" style={{ color: stats.selisih < 0 ? '#D32F2F' : '#388E3C' }}>
                {stats.selisih > 0 ? `+${stats.selisih}` : stats.selisih} Unit
              </Text>
            )} 
          />
          <List.Item title="Progress Tipe Item" right={() => <Text variant="titleMedium">{stats.sudahSO} / {stats.totalTipe}</Text>} />
          
          <Divider style={{ marginVertical: 8 }} />
          
          <List.Item
            title="MATCH (Qty Sesuai)"
            titleStyle={{ color: '#4CAF50' }}
            right={() => <Text variant="titleMedium" style={{ color: '#4CAF50' }}>{stats.matchCount}</Text>}
          />
          <List.Item
            title="KURANG (Unit Hilang)"
            titleStyle={{ color: '#FF9800' }}
            right={() => <Text variant="titleMedium" style={{ color: '#FF9800' }}>{stats.bedaNamaCount}</Text>}
          />
          <List.Item
            title="LEBIH (Aset Berlebih)"
            titleStyle={{ color: '#1565C0' }}
            right={() => <Text variant="titleMedium" style={{ color: '#1565C0' }}>{stats.lebihCount}</Text>}
          />
          <List.Item
            title="TIDAK ADA FISIK (0)"
            titleStyle={{ color: '#F44336' }}
            right={() => <Text variant="titleMedium" style={{ color: '#F44336' }}>{stats.tidakAdaFisikCount}</Text>}
          />
          
          <Divider style={{ marginVertical: 8 }} />

          <List.Item
            title="Belum di-SO"
            titleStyle={{ color: '#757575' }}
            right={() => <Text variant="titleMedium" style={{ color: '#757575' }}>{stats.belumSO}</Text>}
          />

          <Divider style={styles.divider} />
          <List.Item title="Status FINAL" right={() => <Text variant="titleMedium">{stats.finalCount}</Text>} />
          <List.Item title="Status DRAFT" right={() => <Text variant="titleMedium">{stats.draftCount}</Text>} />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="file-excel"
        onPress={handleExport}
        loading={loading}
        disabled={loading}
        style={styles.exportBtn}
        contentStyle={{ height: 60 }}
      >
        EKSPOR HASIL KE EXCEL
      </Button>

      <Button
        mode="outlined"
        icon="database-export"
        onPress={handleBackup}
        disabled={loading}
        style={styles.backupBtn}
        textColor="white"
      >
        BACKUP DATABASE (.DB)
      </Button>

      <Button
        mode="outlined"
        icon="delete-sweep"
        onPress={handleResetAll}
        disabled={loading}
        style={[styles.backupBtn, { backgroundColor: '#B71C1C', borderColor: '#801313', marginTop: 30 }]}
        textColor="white"
      >
        RESET SEMUA HASIL SO
      </Button>

      <Text style={styles.hint}>
        📊 Excel: 3 Sheet (Hasil SO, Belum SO, Summary){`\n`}
        📷 Foto otomatis tersimpan ke Galeri HP, album "Daelim SO"
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    color: '#1565C0',
    marginBottom: 5,
  },
  divider: {
    marginVertical: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  exportBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  backupBtn: {
    backgroundColor: '#1565C0',
    borderColor: '#0D47A1',
    marginTop: 10,
    borderRadius: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 15,
    color: '#757575',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default RekapScreen;
