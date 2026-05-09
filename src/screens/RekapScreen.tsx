import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Title, Card, Button, Divider, List, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService } from '../api/hasilSoService';
import { accountingService } from '../api/accountingService';
import { exportToExcel } from '../api/excelService';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SODashboardStats } from '../constants/types';

const RekapScreen = () => {
  const [stats, setStats] = useState<SODashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await hasilSoService.getSummaryStats();
      setStats(data);
    } catch (e) {
      console.error('Load stats error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleExport = async () => {
    setLoading(true);
    try {
      const hasilSo = await hasilSoService.getAllHasil('', 'Semua');
      const belumSo = await accountingService.getUnverified();
      
      const summaryData = {
        'Sesi SO': 'SO-2024-001',
        'Tanggal Export': new Date().toLocaleString(),
        'Total Accounting': stats?.totalAccounting || 0,
        'Sudah di-SO': stats?.sudahSO || 0,
        'Belum di-SO': stats?.belumSO || 0,
        'Asset Baru': stats?.assetBaru || 0,
        'Progress (%)': stats?.progress || 0
      };

      await exportToExcel(hasilSo, belumSo, summaryData);
    } catch (error: any) {
      console.error('Export handling error:', error);
      Alert.alert('Error', 'Gagal mengekspor data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const dbPath = ((FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '') + 'SQLite/asset_so.db';
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

  if (!stats) return <ActivityIndicator style={{ flex: 1 }} color="#1565C0" />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>📊 RINGKASAN STOCK OPNAME</Title>
          <Text variant="bodySmall" style={{ textAlign: 'center' }}>Sesi: SO-2024-001</Text>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Total Data Accounting"
            right={() => <Text variant="titleMedium">{stats.totalAccounting}</Text>}
          />
          <List.Item
            title="Sudah Terverifikasi (SO)"
            titleStyle={{ color: '#4CAF50' }}
            right={() => <Text variant="titleMedium" style={{ color: '#4CAF50' }}>{stats.sudahSO}</Text>}
          />
          <List.Item
            title="Belum Ditemukan"
            titleStyle={{ color: '#F44336' }}
            right={() => <Text variant="titleMedium" style={{ color: '#F44336' }}>{stats.belumSO}</Text>}
          />
          <List.Item
            title="Aset Baru (Luar List)"
            titleStyle={{ color: '#1565C0' }}
            right={() => <Text variant="titleMedium" style={{ color: '#1565C0' }}>{stats.assetBaru}</Text>}
          />
          
          <Divider style={styles.divider} />
          <View style={styles.progressRow}>
            <Text variant="titleLarge">Progress Akhir:</Text>
            <Text variant="displaySmall" style={{ color: '#1565C0', fontWeight: 'bold' }}>{stats.progress}%</Text>
          </View>
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
        style={[styles.exportBtn, { backgroundColor: '#1565C0', marginTop: 10, borderColor: '#1565C0' }]}
        textColor="white"
      >
        BACKUP DATABASE (.DB)
      </Button>

      <Text style={styles.hint}>
        *File akan berisi 3 Sheet: Hasil Lapangan, Item Belum SO, dan Summary Angka.
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
    marginVertical: 15,
  },
  progressRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  exportBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 15,
    color: '#757575',
    fontSize: 12,
  }
});

export default RekapScreen;
