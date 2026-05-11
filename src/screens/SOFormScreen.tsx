import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  IconButton,
  Divider,
  Badge,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { HasilSO, RefAccounting, computeQtyStatus, parseFotoPaths, stringifyFotoPaths, DEPARTMENTS_LIST } from '../constants/types';
import { hasilSoService } from '../api/hasilSoService';
import { generateNextSoNumber } from '../api/utils';
import { accountingService } from '../api/accountingService';
import AccountingSearchModal from '../components/AccountingSearchModal';
import { useAppStore } from '../store/useAppStore';

const SOFormScreen = ({ route, navigation }: any) => {
  const { soSession } = useAppStore();
  const editItem = route.params?.item as HasilSO | undefined;
  const accItem = route.params?.accItem as RefAccounting | undefined;

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<RefAccounting[]>([]);
  const [accData, setAccData] = useState<RefAccounting[]>([]);
  const [linkedAccounting, setLinkedAccounting] = useState<RefAccounting | null>(null);
  const [prevQty, setPrevQty] = useState(0);
  const [deptSuggestions, setDeptSuggestions] = useState<string[]>([]);

  // V2 State
  const [fotoList, setFotoList] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<HasilSO>>({
    no_so: '',
    nama_lapangan: '',
    spesifikasi: '',
    pembuat: '',
    daya_kw: '',
    tahun_buat: '',
    tahun_beli: '',
    departemen: '',
    no_invoice: '',
    no_po: '',
    qty_accounting: 0,
    qty_aktual: 0,
    status_pengadaan: 'Beli',
    kondisi: 'Lama',
    catatan: '',
    status_match: 'MATCH',
    status_so: 'DRAFT',
    so_session: soSession,
  });

  useEffect(() => {
    loadAccData();
    if (editItem) {
      setForm(editItem);
      setFotoList(parseFotoPaths(editItem.foto_paths));
      if (editItem.ref_accounting_id) {
        setLinkedAccounting({
          id: editItem.ref_accounting_id,
          nama_accounting: editItem.nama_accounting || '',
          qty_accounting: editItem.qty_accounting,
          departemen: editItem.departemen,
        } as RefAccounting);
        loadPrevQty(editItem.ref_accounting_id, editItem.id);
      }
    } else if (accItem) {
      handleSelectAccounting(accItem);
      initNewForm();
    } else {
      initNewForm();
    }
  }, [editItem, accItem]);

  const loadPrevQty = async (refId: number, currentId?: number) => {
    const qty = await hasilSoService.getPreviousQty(refId, currentId);
    setPrevQty(qty);
  };

  const initNewForm = async () => {
    const nextNo = await generateNextSoNumber();
    setForm(prev => ({ ...prev, no_so: nextNo }));
  };

  const loadAccData = async () => {
    const data = await accountingService.getAll();
    setAccData(data);
  };

  const handleNameChange = (text: string) => {
    setForm(prev => ({ ...prev, nama_lapangan: text }));
    if (text.length >= 1) {
      const lower = text.toLowerCase();
      const filtered = accData
        .filter(item =>
          (item.nama_accounting != null && String(item.nama_accounting).toLowerCase().includes(lower)) ||
          (item.nama_maintenance != null && String(item.nama_maintenance).toLowerCase().includes(lower))
        )
        .slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handlePickImage = async () => {
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;
    const tempUri = result.assets[0].uri;

    try {
      const photoDir = FileSystem.documentDirectory + 'photos/';
      const dirInfo = await FileSystem.getInfoAsync(photoDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
      }

      const noSo = form.no_so || 'SO-TEMP';
      const machineName = (form.nama_lapangan || 'ITEM').replace(/\s+/g, '_').substring(0, 15);
      const fileName = `${noSo}_${machineName}_${Date.now()}.jpg`;
      const persistentUri = photoDir + fileName;
      await FileSystem.copyAsync({ from: tempUri, to: persistentUri });

      if (mediaStatus === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(persistentUri);
        await MediaLibrary.createAlbumAsync('Daelim SO', asset, true);
      }

      setFotoList(prev => [...prev, persistentUri]);
    } catch (err) {
      console.warn('Error saving photo:', err);
      setFotoList(prev => [...prev, tempUri]);
    }
  };

  const removeFoto = (index: number) => {
    setFotoList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectAccounting = (acc: RefAccounting) => {
    setLinkedAccounting(acc);
    const accQty = acc.qty_accounting || 1;
    
    setForm(prev => {
      const newStatus = computeQtyStatus(prev.qty_aktual || 0, accQty, true);
      return {
        ...prev,
        nama_accounting: acc.nama_accounting,
        ref_accounting_id: acc.id,
        spesifikasi: acc.spesifikasi || prev.spesifikasi,
        pembuat: acc.pembuat || prev.pembuat,
        daya_kw: acc.daya_kw || prev.daya_kw,
        tahun_buat: acc.tahun_buat || prev.tahun_buat,
        no_po: acc.no_po || prev.no_po,
        departemen: acc.departemen || prev.departemen,

        qty_accounting: accQty,
        status_match: newStatus,
        nama_lapangan: acc.nama_maintenance || acc.nama_accounting, // Default to maintenance name if exists
      };
    });
    if (acc.id) loadPrevQty(acc.id);
    setSuggestions([]);
    setModalVisible(false);
  };

  const handleRemoveMapping = () => {
    setLinkedAccounting(null);
    setForm(prev => ({
      ...prev,
      ref_accounting_id: undefined,
      nama_accounting: undefined,
      qty_accounting: 0,
      status_match: 'MATCH',
    }));
    setPrevQty(0);
  };

  const updateField = (field: keyof HasilSO) => (value: any) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Update status match jika qty berubah
      if (field === 'qty_aktual' || field === 'qty_accounting') {
        newForm.status_match = computeQtyStatus(
          Number(newForm.qty_aktual || 0), 
          Number(newForm.qty_accounting || 0),
          !!newForm.ref_accounting_id
        );
      }
      return newForm;
    });

    // Suggestion Departemen
    if (field === 'departemen') {
      if (value.length > 0) {
        const filtered = DEPARTMENTS_LIST.filter(d => 
          d.toLowerCase().includes(value.toLowerCase()) && d.toLowerCase() !== value.toLowerCase()
        ).slice(0, 5);
        setDeptSuggestions(filtered);
      } else {
        setDeptSuggestions([]);
      }
    }
  };

  const handleSave = async (status: 'DRAFT' | 'FINAL') => {
    if (!form.nama_lapangan?.trim()) return Alert.alert('Error', 'Nama Item wajib diisi');
    if (!form.departemen?.trim()) return Alert.alert('Error', 'Departemen wajib diisi');

    setLoading(true);
    try {
      const dataToSave = {
        ...form,
        status_so: status,
        foto_paths: stringifyFotoPaths(fotoList),
      } as HasilSO;
      
      await hasilSoService.saveHasil(dataToSave);
      setLoading(false);
      navigation.goBack();
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'Gagal simpan: ' + error.message);
    }
  };

  const getStatusMatchColor = (status: string) => {
    const colors: Record<string, string> = {
      MATCH: '#4CAF50',
      KURANG: '#FF9800',
      LEBIH: '#1565C0',
      TIDAK_ADA: '#F44336',
    };
    return colors[status] || '#757575';
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* MULTIPLE PHOTOS */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>FOTO ITEM (Multiple)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {fotoList.map((path, idx) => (
                <View key={idx} style={styles.photoItem}>
                  <Image source={{ uri: path }} style={styles.image} />
                  <IconButton
                    icon="close-circle"
                    iconColor="red"
                    size={20}
                    style={styles.removeBtn}
                    onPress={() => removeFoto(idx)}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickImage}>
                <IconButton icon="camera-plus" size={30} iconColor="#1565C0" />
                <Text variant="labelSmall" style={{ color: '#1565C0' }}>Tambah</Text>
              </TouchableOpacity>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* QUANTITY SECTION */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 0 }]}>KUANTITAS</Text>
              <Badge style={{ backgroundColor: '#1565C0' }}>{form.no_so}</Badge>
            </View>
            <View style={styles.qtyRow}>
              <View style={styles.qtyBox}>
                <Text variant="labelSmall">Target (Accounting)</Text>
                <Text variant="titleLarge" style={styles.qtyTarget}>{form.qty_accounting || 0}</Text>
                {linkedAccounting && (
                  <Text variant="labelSmall" style={{ color: '#1565C0', marginTop: 4 }}>
                    Input sblmnya: {prevQty}
                  </Text>
                )}
              </View>
              <View style={styles.qtyDivider} />
              <View style={styles.qtyBox}>
                <Text variant="labelSmall">Aktual (Lapangan)</Text>
                <TextInput
                  value={String(form.qty_aktual || 0)}
                  onChangeText={(val) => updateField('qty_aktual')(val.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  mode="outlined"
                  dense
                  style={styles.qtyInput}
                />
              </View>
            </View>
            {linkedAccounting && (
              <Text variant="bodySmall" style={{ textAlign: 'center', color: '#666', marginTop: 5 }}>
                Total: {prevQty + Number(form.qty_aktual || 0)} / {form.qty_accounting}
              </Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusMatchColor(form.status_match || 'MATCH') }]}>
              <Text style={styles.statusText}>STATUS: {form.status_match}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* DATA LAPANGAN */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>DETAIL ITEM</Text>
            
            <View style={styles.row}>
              <View style={[styles.half, { marginBottom: 15 }]}>
                <Text variant="labelSmall" style={{ marginBottom: 8, color: '#757575' }}>STATUS PENGADAAN</Text>
                <SegmentedButtons
                  value={form.status_pengadaan || 'Beli'}
                  onValueChange={val => setForm(prev => ({ ...prev, status_pengadaan: val as any }))}
                  buttons={[
                    { value: 'Beli', label: 'Beli', icon: 'cart-outline' },
                    { value: 'Buat Sendiri', label: 'Buat', icon: 'hammer-wrench' },
                  ]}
                  density="medium"
                />
              </View>
              <View style={[styles.half, { marginBottom: 15 }]}>
                <Text variant="labelSmall" style={{ marginBottom: 8, color: '#757575' }}>KONDISI</Text>
                <SegmentedButtons
                  value={form.kondisi || 'Lama'}
                  onValueChange={val => setForm(prev => ({ ...prev, kondisi: val as any }))}
                  buttons={[
                    { value: 'Lama', label: 'Lama', icon: 'history' },
                    { value: 'Baru', label: 'Baru', icon: 'sparkles' },
                  ]}
                  density="medium"
                />
              </View>
            </View>

            <TextInput
              label="Nama Item*"
              value={form.nama_lapangan}
              onChangeText={handleNameChange}
              mode="outlined"
              style={styles.input}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity key={idx} onPress={() => handleSelectAccounting(item)} style={styles.suggestionItem}>
                    <Text style={{ fontWeight: 'bold', color: '#1565C0' }}>
                      {item.nama_maintenance || '(Tanpa Nama Maintenance)'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#444' }}>
                      Ref: {item.nama_accounting}
                    </Text>
                    <Text variant="labelSmall" style={{ color: '#757575' }}>
                      {item.spesifikasi} | Qty: {item.qty_accounting}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              label="Spesifikasi"
              value={form.spesifikasi}
              onChangeText={updateField('spesifikasi')}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                label="Merk"
                value={form.pembuat}
                onChangeText={updateField('pembuat')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
              <TextInput
                label="Daya (KW)"
                value={form.daya_kw}
                onChangeText={updateField('daya_kw')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Thn Buat"
                value={form.tahun_buat}
                onChangeText={updateField('tahun_buat')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
              <TextInput
                label="No PO"
                value={form.no_po}
                onChangeText={updateField('no_po')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>

            <View>
              <TextInput
                label="Departemen*"
                value={form.departemen}
                onChangeText={updateField('departemen')}
                mode="outlined"
                style={styles.input}
              />
              {deptSuggestions.length > 0 && (
                <View style={styles.deptSuggestions}>
                  {deptSuggestions.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.deptSuggestionItem}
                      onPress={() => {
                        updateField('departemen')(item);
                        setDeptSuggestions([]);
                      }}
                    >
                      <Text>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <TextInput
              label="Catatan"
              value={form.catatan}
              onChangeText={updateField('catatan')}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Button mode="outlined" onPress={() => handleSave('DRAFT')} disabled={loading} style={styles.footerBtn}>
            DRAFT
          </Button>
          <Button mode="contained" onPress={() => handleSave('FINAL')} loading={loading} disabled={loading} style={[styles.footerBtn, { backgroundColor: '#1565C0' }]}>
            SIMPAN FINAL
          </Button>
        </View>

      </ScrollView>

      <AccountingSearchModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSelect={handleSelectAccounting}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 10, elevation: 2 },
  sectionTitle: { color: '#1565C0', fontWeight: 'bold', marginBottom: 10, fontSize: 14 },
  input: {
    marginBottom: 12,
  },
  deptSuggestions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginTop: -8,
    marginBottom: 12,
    elevation: 3,
    zIndex: 1000,
  },
  deptSuggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  
  // Photo list
  photoList: { flexDirection: 'row', paddingVertical: 5 },
  photoItem: { marginRight: 10, position: 'relative' },
  image: { width: 100, height: 100, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: -10, right: -10 },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },

  // Qty
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  qtyBox: { flex: 1, alignItems: 'center' },
  qtyTarget: { color: '#757575', fontWeight: 'bold', marginTop: 5 },
  qtyInput: { width: 80, textAlign: 'center' },
  qtyDivider: { width: 1, height: 40, backgroundColor: '#ddd' },
  
  statusBadge: { alignSelf: 'center', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  // Suggestion
  suggestionBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: -5, marginBottom: 10 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },

  footer: { flexDirection: 'row', padding: 15, gap: 10, marginBottom: 30 },
  footerBtn: { flex: 1 },
});

export default SOFormScreen;
