import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Searchbar, List, FAB, Chip, Text, Checkbox, Button, Card } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { accountingService } from '../api/accountingService';
import { hasilSoService } from '../api/hasilSoService';
import { RefAccounting, HasilSO } from '../constants/types';

const SOListScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RefAccounting[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const loadData = useCallback(async () => {
    const data = await accountingService.getUnverified();
    setItems(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredItems = items.filter(item => 
    item.nama_accounting.toLowerCase().includes(search.toLowerCase()) ||
    item.no_invoice?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleBatchSO = () => {
    const selectedItems = items.filter(item => selectedIds.includes(item.id!));
    if (selectedItems.length === 0) return;

    Alert.alert(
      'Batch Stock Opname',
      `Anda memilih ${selectedItems.length} mesin. Gunakan data & foto yang sama untuk semua mesin ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Lanjutkan', 
          onPress: () => {
            navigation.navigate('SOForm', { 
              batchItems: selectedItems,
              isBatch: true 
            });
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Cari Invoice atau Nama Mesin..."
        onChangeText={setSearch}
        value={search}
        style={styles.search}
      />

      <View style={styles.header}>
        <Text variant="bodySmall">{filteredItems.length} Aset belum SO</Text>
        <Button 
          mode="text" 
          onPress={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedIds([]);
          }}
        >
          {isSelectionMode ? 'Batal Pilih' : 'Pilih Banyak'}
        </Button>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id?.toString() || ''}
        renderItem={({ item }) => (
          <List.Item
            title={item.nama_accounting}
            description={`Inv: ${item.no_invoice || '-'} | Dept: ${item.departemen || '-'}`}
            onPress={() => isSelectionMode ? toggleSelect(item.id!) : navigation.navigate('SOForm', { accItem: item })}
            left={props => isSelectionMode ? (
              <Checkbox 
                status={selectedIds.includes(item.id!) ? 'checked' : 'unchecked'} 
                onPress={() => toggleSelect(item.id!)}
              />
            ) : <List.Icon {...props} icon="cube-outline" />}
            style={styles.listItem}
          />
        )}
      />

      {isSelectionMode && selectedIds.length > 0 && (
        <FAB
          icon="check-all"
          label={`Proses ${selectedIds.length} Mesin`}
          style={styles.fab}
          onPress={handleBatchSO}
          color="white"
        />
      )}

      {!isSelectionMode && (
        <FAB
          icon="plus"
          label="Aset Baru"
          style={styles.fab}
          onPress={() => navigation.navigate('SOForm')}
          color="white"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: { margin: 10, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
  listItem: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#1565C0' },
});

export default SOListScreen;
