import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Title, Card, RadioButton, Divider, HelperText, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { HasilSO, RefAccounting } from '../constants/types';
import { generateNextAssetNumber } from '../api/utils';
import { hasilSoService } from '../api/hasilSoService';
import AccountingSearchModal from '../components/AccountingSearchModal';

const SOFormScreen = ({ route, navigation }: any) => {
  const editItem = route.params?.item as HasilSO | undefined;
  
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form States
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

  const [linkedAcc, setLinkedAcc] = useState<RefAccounting | null>(null);

  useEffect(() => {
    if (editItem) {
      setForm(editItem);
      // Fetch linked accounting if exists
      // For now we assume the data is complete in editItem
    } else {
      initNewForm();
    }
  }, [editItem]);

  const initNewForm = async () => {
    const nextNo = await generateNextAssetNumber();
    setForm(prev => ({ ...prev, no_asset: nextNo }));
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, // Auto-compress to 70% quality as per design.md
    });

    if (!result.canceled) {
      setForm(prev => ({ ...prev, foto_path: result.assets[0].uri }));
    }
  };

  const handleSelectAccounting = (acc: RefAccounting) => {
    setLinkedAcc(acc);
    setModalVisible(false);
    
    // Auto-fill logic
    const isNameMatch = form.nama_lapangan?.toLowerCase() === acc.nama_accounting.toLowerCase();
    
    setForm(prev => ({
      ...prev,
      ref_accounting_id: acc.id,
      nama_accounting: acc.nama_accounting,
      spesifikasi: prev.spesifikasi || acc.spesifikasi,
      pembuat: prev.pembuat || acc.pembuat,
      daya_kw: prev.daya_kw || acc.daya_kw,
      tahun_beli: prev.tahun_beli || acc.tahun_beli,
      no_invoice: prev.no_invoice || acc.no_invoice,
      departemen: prev.departemen || acc.departemen,
      status_match: isNameMatch ? 'MATCH' : 'BEDA_NAMA',
    }));
  };

  const validate = () => {
    if (!form.nama_lapangan) {
      Alert.alert('Error', 'Nama Mesin (Lapangan) wajib diisi');
      return false;
    }
    if (!form.departemen) {
      Alert.alert('Error', 'Departemen wajib diisi');
      return false;
    }
    return true;
  };

  const handleSave = async (status: 'DRAFT' | 'FINAL') => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const dataToSave = {
        ...form,
        status_so: status,
      } as HasilSO;
      
      await hasilSoService.saveHasil(dataToSave);
      setLoading(false);
      Alert.alert('Sukses', `Data berhasil disimpan sebagai ${status}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Gagal menyimpan data');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* PHOTO SECTION */}
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
          <Title>Data Lapangan</Title>
          <TextInput
            label="No Asset (Auto)"
            value={form.no_asset}
            disabled
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Nama Mesin (Lapangan)*"
            value={form.nama_lapangan}
            onChangeText={val => setForm(p => ({ ...p, nama_lapangan: val }))}
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              label="Spesifikasi"
              value={form.spesifikasi}
              onChangeText={val => setForm(p => ({ ...p, spesifikasi: val }))}
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 5 }]}
            />
            <TextInput
              label="Pembuat/Merk"
              value={form.pembuat}
              onChangeText={val => setForm(p => ({ ...p, pembuat: val }))}
              mode="outlined"
              style={[styles.input, { flex: 1, marginLeft: 5 }]}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              label="Daya (Kw)"
              value={form.daya_kw}
              onChangeText={val => setForm(p => ({ ...p, daya_kw: val }))}
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 5 }]}
            />
            <TextInput
              label="Tahun Beli"
              value={form.tahun_beli}
              onChangeText={val => setForm(p => ({ ...p, tahun_beli: val }))}
              mode="outlined"
              style={[styles.input, { flex: 1, marginLeft: 5 }]}
            />
          </View>
          <TextInput
            label="Departemen*"
            value={form.departemen}
            onChangeText={val => setForm(p => ({ ...p, departemen: val }))}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="No Invoice"
            value={form.no_invoice}
            onChangeText={val => setForm(p => ({ ...p, no_invoice: val }))}
            mode="outlined"
            style={styles.input}
          />

          <Text variant="labelLarge" style={{ marginTop: 10 }}>Pengadaan</Text>
          <RadioButton.Group 
            onValueChange={value => setForm(p => ({ ...p, status_pengadaan: value as any }))} 
            value={form.status_pengadaan || 'Beli'}
          >
            <View style={styles.row}>
              <View style={styles.radioRow}>
                <RadioButton value="Beli" />
                <Text>Beli</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="Buat Sendiri" />
                <Text>Buat Sendiri</Text>
              </View>
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Mapping Accounting</Title>
          {form.ref_accounting_id ? (
            <View style={styles.linkedBox}>
              <Text variant="bodyMedium" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                ✅ Terhubung ke: {form.nama_accounting}
              </Text>
              <Text variant="bodySmall">Invoice: {form.no_invoice}</Text>
              <Button mode="text" onPress={() => setForm(p => ({ ...p, ref_accounting_id: undefined, nama_accounting: '' }))}>
                Hapus Mapping
              </Button>
            </View>
          ) : (
            <Button 
              mode="outlined" 
              icon="link" 
              onPress={() => setModalVisible(true)}
              style={styles.linkBtn}
            >
              Hubungkan ke Data Accounting
            </Button>
          )}

          <Text variant="labelLarge" style={{ marginTop: 10 }}>Status Match</Text>
          <RadioButton.Group 
            onValueChange={value => setForm(p => ({ ...p, status_match: value as any }))} 
            value={form.status_match || 'BARU'}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {['MATCH', 'BEDA_NAMA', 'BARU', 'TIDAK_ADA_FISIK'].map(status => (
                  <View key={status} style={styles.radioRow}>
                    <RadioButton value={status} />
                    <Text>{status.replace('_', ' ')}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Button 
          mode="outlined" 
          onPress={() => handleSave('DRAFT')} 
          disabled={loading}
          style={[styles.footerBtn, { flex: 1, marginRight: 5 }]}
        >
          SIMPAN DRAFT
        </Button>
        <Button 
          mode="contained" 
          onPress={() => handleSave('FINAL')} 
          disabled={loading}
          style={[styles.footerBtn, { flex: 1, marginLeft: 5, backgroundColor: '#1565C0' }]}
        >
          SIMPAN & FINAL
        </Button>
      </View>

      <AccountingSearchModal 
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSelect={handleSelectAccounting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  photoContainer: {
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  card: {
    margin: 10,
    elevation: 2,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  linkedBox: {
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 10,
  },
  linkBtn: {
    marginVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 30,
  },
  footerBtn: {
    height: 50,
    justifyContent: 'center',
  }
});

export default SOFormScreen;
