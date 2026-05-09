import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Searchbar, List, IconButton, Badge } from 'react-native-paper';
import { accountingService } from '../api/accountingService';
import { RefAccounting } from '../constants/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (item: RefAccounting) => void;
}

const AccountingSearchModal = ({ visible, onDismiss, onSelect }: Props) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RefAccounting[]>([]);
  const [filteredItems, setFilteredItems] = useState<RefAccounting[]>([]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    const data = await accountingService.getAll();
    setItems(data);
    setFilteredItems(data);
  };

  useEffect(() => {
    const filtered = items.filter(item => 
      item.nama_accounting.toLowerCase().includes(search.toLowerCase()) ||
      (item.no_invoice && item.no_invoice.toLowerCase().includes(search.toLowerCase()))
    );
    setFilteredItems(filtered);
  }, [search, items]);

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text variant="titleLarge">Cari Data Accounting</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <Searchbar
          placeholder="Ketik nama mesin..."
          onChangeText={setSearch}
          value={search}
          style={styles.search}
          elevation={0}
        />

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelect(item)}>
              <List.Item
                title={item.nama_accounting}
                description={`Inv: ${item.no_invoice || '-'} | Dept: ${item.departemen || '-'}`}
                right={() => item.is_verified === 1 ? (
                  <Badge style={{ backgroundColor: '#4CAF50', alignSelf: 'center' }}>SUDAH SO</Badge>
                ) : null}
                style={styles.listItem}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Data tidak ditemukan</Text>}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  search: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#757575',
  }
});

export default AccountingSearchModal;
