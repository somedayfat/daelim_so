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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setLoadError(null);
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const data = await accountingService.getAll();
      console.log('[Modal] accountingService.getAll() returned:', data.length, 'items');
      // Pastikan semua item punya nama_accounting yang valid
      const safe = data.filter(
        (item) => item.nama_accounting != null && String(item.nama_accounting).trim().length > 0
      );
      setItems(safe);
      setFilteredItems(safe);
    } catch (err: any) {
      console.error('[Modal] loadData error:', err?.message || err);
      setLoadError('Gagal memuat data: ' + (err?.message || String(err)));
    }
  };

  useEffect(() => {
    // Null-safe filter: cek nama_accounting tidak null sebelum toLowerCase
    const q = search.toLowerCase().trim();
    if (!q) {
      setFilteredItems(items);
      return;
    }
    const filtered = items.filter((item) => {
      const nama = item.nama_accounting ? String(item.nama_accounting).toLowerCase() : '';
      const inv = item.no_invoice ? String(item.no_invoice).toLowerCase() : '';
      const dept = item.departemen ? String(item.departemen).toLowerCase() : '';
      return nama.includes(q) || inv.includes(q) || dept.includes(q);
    });
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

        {/* Info jumlah data */}
        <Text variant="bodySmall" style={styles.countInfo}>
          {loadError
            ? `⚠️ ${loadError}`
            : `${filteredItems.length} dari ${items.length} data`}
        </Text>

        <FlatList
          data={filteredItems}
          keyExtractor={(item, idx) => (item.id != null ? String(item.id) : String(idx))}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelect(item)}>
              <List.Item
                title={String(item.nama_accounting || '-')}
                description={[
                  item.spesifikasi,
                  item.daya_kw ? `${item.daya_kw} Kw` : '',
                  item.departemen,
                  item.no_invoice ? `Inv: ${item.no_invoice}` : '',
                ]
                  .filter(Boolean)
                  .join(' | ') || '-'}
                right={() =>
                  item.is_verified === 1 ? (
                    <Badge style={{ backgroundColor: '#FF9800', alignSelf: 'center' }}>
                      SUDAH SO
                    </Badge>
                  ) : (
                    <Badge style={{ backgroundColor: '#4CAF50', alignSelf: 'center' }}>
                      BELUM
                    </Badge>
                  )
                }
                style={styles.listItem}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>
                {loadError ? '⚠️ Error memuat data' : items.length === 0 ? '📭 Belum ada data Accounting.\nImport Excel terlebih dahulu.' : '🔍 Tidak ditemukan'}
              </Text>
            </View>
          }
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
    borderRadius: 12,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  search: {
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  countInfo: {
    color: '#9E9E9E',
    marginBottom: 8,
    paddingLeft: 4,
  },
  list: {
    flex: 1,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#757575',
    lineHeight: 22,
  },
});

export default AccountingSearchModal;
