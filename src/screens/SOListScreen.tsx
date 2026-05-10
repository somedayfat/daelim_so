import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, List, FAB, Chip, Text, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { hasilSoService } from '../api/hasilSoService';
import { HasilSO } from '../constants/types';

const STATUS_COLORS: Record<string, string> = {
  MATCH: '#4CAF50',
  BEDA_NAMA: '#FF9800',
  BARU: '#1565C0',
  TIDAK_ADA_FISIK: '#F44336',
};

const FILTERS = ['Semua', 'Draft', 'Final', 'Belum di-SO'];

const SOListScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HasilSO[]>([]);
  const [activeFilter, setActiveFilter] = useState('Semua');

  const loadData = useCallback(async () => {
    const data = await hasilSoService.getAllHasil(search, activeFilter);
    setItems(data);
  }, [search, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStatusColor = (status: string) => STATUS_COLORS[status] || '#757575';

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Cari Nama Mesin atau No Asset..."
        onChangeText={setSearch}
        value={search}
        style={styles.search}
      />

      <View style={styles.chipRow}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
          renderItem={({ item }) => (
            <Chip
              selected={activeFilter === item}
              onPress={() => setActiveFilter(item)}
              style={[styles.chip, activeFilter === item && { backgroundColor: '#1565C0' }]}
              textStyle={activeFilter === item ? { color: '#fff' } : undefined}
            >
              {item}
            </Chip>
          )}
        />
      </View>

      <Text variant="bodySmall" style={styles.count}>
        {items.length} aset ditemukan
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.no_asset || item.id?.toString() || ''}
        renderItem={({ item }) => (
          <List.Item
            title={item.nama_lapangan || item.nama_accounting}
            description={`${item.no_asset} | ${item.departemen || '-'}`}
            onPress={() => navigation.navigate('SOForm', { item })}
            left={props => (
              <View style={styles.badgeContainer}>
                <Badge
                  size={12}
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status_match) }]}
                />
              </View>
            )}
            right={() => (
              <View style={styles.rightBadges}>
                <Badge
                  size={24}
                  style={[styles.matchBadge, { backgroundColor: getStatusColor(item.status_match) }]}
                >
                  {item.status_match === 'BEDA_NAMA' ? 'BD' :
                   item.status_match === 'TIDAK_ADA_FISIK' ? 'TF' :
                   item.status_match === 'BARU' ? 'BR' : 'MC'}
                </Badge>
                <Badge
                  style={[styles.soBadge, { backgroundColor: item.status_so === 'FINAL' ? '#4CAF50' : '#FF9800' }]}
                >
                  {item.status_so}
                </Badge>
              </View>
            )}
            style={styles.listItem}
          />
        )}
      />

      <FAB
        icon="plus"
        label="Aset Baru"
        style={styles.fab}
        onPress={() => navigation.navigate('SOForm')}
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: { margin: 10, elevation: 2 },
  chipRow: { marginBottom: 4 },
  chipContainer: { paddingHorizontal: 10, gap: 6 },
  chip: { marginRight: 6 },
  count: { paddingHorizontal: 16, marginBottom: 4, color: '#757575' },
  listItem: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  badgeContainer: { justifyContent: 'center', paddingLeft: 8 },
  statusBadge: { position: 'absolute' },
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  matchBadge: { borderRadius: 4 },
  soBadge: { borderRadius: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#1565C0' },
});

export default SOListScreen;