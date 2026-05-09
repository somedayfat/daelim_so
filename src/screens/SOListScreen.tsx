import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, SegmentedButtons, Card, Badge, FAB, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService } from '../api/hasilSoService';
import { HasilSO } from '../constants/types';

const SOListScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [items, setItems] = useState<HasilSO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hasilSoService.getAllHasil(searchQuery, filter);
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getMatchColor = (status: string) => {
    switch (status) {
      case 'MATCH': return '#4CAF50';
      case 'BEDA_NAMA': return '#FFC107';
      case 'BARU': return '#2196F3';
      case 'TIDAK_ADA_FISIK': return '#F44336';
      default: return '#757575';
    }
  };

  const renderItem = ({ item }: { item: HasilSO }) => (
    <Card 
      style={styles.card} 
      onPress={() => navigation.navigate('SOForm', { item })}
    >
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={styles.assetNo}>{item.no_asset}</Text>
            <Text variant="titleMedium">{item.nama_lapangan}</Text>
            <Text variant="bodySmall">{item.departemen || 'Tanpa Departemen'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Badge 
              style={[styles.badge, { backgroundColor: getMatchColor(item.status_match) }]}
            >
              {item.status_match}
            </Badge>
            <Badge 
              style={[styles.soBadge, { backgroundColor: item.status_so === 'FINAL' ? '#2E7D32' : '#757575' }]}
            >
              {item.status_so}
            </Badge>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Cari Asset..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.search}
      />
      
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'Semua', label: 'Semua' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Final', label: 'Final' },
        ]}
        style={styles.filter}
      />

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.no_asset}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text>Belum ada data SO.</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('SOForm')}
        label="SO BARU"
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  search: {
    margin: 10,
    elevation: 2,
    backgroundColor: '#fff',
  },
  filter: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  list: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 10,
    backgroundColor: '#fff',
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetNo: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  badge: {
    marginBottom: 5,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  soBadge: {
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1565C0',
  },
  empty: {
    alignItems: 'center',
    marginTop: 50,
  }
});

export default SOListScreen;
