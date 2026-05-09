import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ProgressBar, Title, IconButton } from 'react-native-paper';
import { useAppStore } from '../store/useAppStore';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService } from '../api/hasilSoService';

const DashboardScreen = ({ navigation }: any) => {
  const { soSession, stats, setStats } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

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
            <Text>{stats.sudahSO} / {stats.totalAccounting} Mesin</Text>
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
          onPress={() => navigation.navigate('Import')} 
          style={styles.button}
          icon="file-import"
        >
          Import Data Accounting
        </Button>
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
          Rekap & Export Excel
        </Button>
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
  }
});

export default DashboardScreen;
