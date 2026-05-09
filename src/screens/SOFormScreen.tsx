import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Title, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { HasilSO, RefAccounting } from '../constants/types';
import { generateNextAssetNumber } from '../api/utils';
import { hasilSoService } from '../api/hasilSoService';
import { accountingService } from '../api/accountingService';
import AccountingSearchModal from '../components/AccountingSearchModal';

const SOFormScreen = ({ route, navigation }: any) => {
  const editItem = route.params?.item as HasilSO | undefined;
  const accItem = route.params?.accItem as RefAccounting | undefined;
  const batchItems = route.params?.batchItems as RefAccounting[] | undefined;
  const isBatch = route.params?.isBatch || false;
  
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<RefAccounting[]>([]);
  const [accData, setAccData] = useState<RefAccounting[]>([]);
  
  const [form, setForm] = useState<Partial<HasilSO>>({
    no_asset: '',
    nama_lapangan: '',
    spesifikasi: '',
    pembuat: '',
    daya_kw: '',
    tahun_buat: '',
    tahun_beli: '',
    departemen: '',
    no_invoice: '',
    status_pengadaan: 'Beli',
    catatan: '',
    status_match: 'BARU',
    status_so: 'DRAFT',
    foto_path: '',
  });

  useEffect(() => {
    loadAccData();
    if (editItem) {
      setForm(editItem);
    } else if (accItem) {
      handleSelectAccounting(accItem);
    } else if (isBatch && batchItems && batchItems.length > 0) {
      handleSelectAccounting(batchItems[0]); // Use first item as template
    } else {
      initNewForm();
    }
  }, [editItem, accItem, isBatch]);

  const loadAccData = async () => {
    const data = await accountingService.getAll();
    setAccData(data);
  };

  const initNewForm = async () => {
    const nextNo = await generateNextAssetNumber();
    setForm(prev => ({ ...prev, no_asset: nextNo }));
  };

  const handleNameChange = (text: string) => {
    setForm(prev => ({ ...prev, nama_lapangan: text }));
    if (text.length > 1) {
      const filtered = accData.filter(item => 
        item.nama_accounting.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setForm(prev => ({ ...prev, foto_path: result.assets[0].uri }));
    }
  };

  const handleSelectAccounting = (acc: RefAccounting) => {
    setForm(prev => ({
      ...prev,
      ref_accounting_id: acc.id,
      nama_accounting: acc.nama_accounting,
      nama_lapangan: prev.nama_lapangan || acc.nama_accounting,
      spesifikasi: prev.spesifikasi || acc.spesifikasi,
      pembuat: prev.pembuat || acc.pembuat,
      daya_kw: prev.daya_kw || acc.daya_kw,
      tahun_beli: prev.tahun_beli || acc.tahun_beli,
      no_invoice: prev.no_invoice || acc.no_invoice,
      departemen: prev.departemen || acc.departemen,
      status_match: 'MATCH',
    }));
  };

  const handleSave = async (status: 'DRAFT' | 'FINAL') => {
    if (!form.nama_lapangan) return Alert.alert('Error', 'Nama Mesin wajib diisi');
    
    setLoading(true);
    try {
      if (isBatch && batchItems) {
        // SAVE FOR ALL ITEMS IN BATCH
        for (const item of batchItems) {
          const nextNo = await generateNextAssetNumber();
          const batchData = {
            ...form,
            no_asset: nextNo,
            ref_accounting_id: item.id,
            nama_accounting: item.nama_accounting,
            status_so: status,
          } as HasilSO;
          await hasilSoService.saveHasil(batchData);
        }
        Alert.alert('Sukses', `${batchItems.length} mesin berhasil diproses sekaligus!`);
      } else {
        await hasilSoService.saveHasil({ ...form, status_so: status } as HasilSO);
      }
      setLoading(false);
      navigation.goBack();
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', 'Gagal simpan: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {isBatch && (
        <View style={styles.batchNotice}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>MODE BATCH: {batchItems?.length} Mesin terpilih</Text>
        </View>
      )}

      <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage}>
        {form.foto_path ? (
          <Image source={{ uri: form.foto_path }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <IconButton icon="camera" size={40} iconColor="#757575" />
            <Text>Ambil Foto Mesin</Text>
          </View>
        )}
      </TouchableOpacity>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Nama Mesin (Lapangan)*"
            value={form.nama_lapangan}
            onChangeText={handleNameChange}
            mode="outlined"
            style={styles.input}
          />
          
          {suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {suggestions.map((item, idx) => (
                <TouchableOpacity key={idx} onPress={() => { handleSelectAccounting(item); setSuggestions([]); }} style={styles.suggestionItem}>
                  <Text>{item.nama_accounting} ({item.departemen})</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.row}>
            <TextInput label="Spesifikasi" value={form.spesifikasi} onChangeText={v => setForm(p=>({...p, spesifikasi:v}))} mode="outlined" style={[styles.input, {flex:1, marginRight:5}]} />
            <TextInput label="Merk" value={form.pembuat} onChangeText={v => setForm(p=>({...p, pembuat:v}))} mode="outlined" style={[styles.input, {flex:1, marginLeft:5}]} />
          </View>
          <TextInput label="Departemen" value={form.departemen} onChangeText={v => setForm(p=>({...p, departemen:v}))} mode="outlined" style={styles.input} />
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Button mode="outlined" onPress={() => handleSave('DRAFT')} disabled={loading} style={{flex:1, marginRight:5}}>DRAFT</Button>
        <Button mode="contained" onPress={() => handleSave('FINAL')} loading={loading} disabled={loading} style={{flex:1, marginLeft:5, backgroundColor:'#1565C0'}}>
          {isBatch ? `UPDATE ${batchItems?.length} MESIN` : 'SIMPAN FINAL'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  batchNotice: { backgroundColor: '#FF9800', padding: 10, alignItems: 'center' },
  photoContainer: { height: 180, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  card: { margin: 10, elevation: 2 },
  input: { marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row' },
  suggestionBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 4, marginTop: -5, marginBottom: 10 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  footer: { flexDirection: 'row', padding: 15, marginBottom: 20 }
});

export default SOFormScreen;
