import React, { useState, useEffect, useRef } from 'react';
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
  RadioButton,
  Divider,
  Badge,
  Chip,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { HasilSO, RefAccounting } from '../constants/types';
import { generateNextAssetNumber } from '../api/utils';
import { hasilSoService } from '../api/hasilSoService';
import { accountingService } from '../api/accountingService';
import AccountingSearchModal from '../components/AccountingSearchModal';
import BatchPhotoFlow from '../components/BatchPhotoFlow';

const SOFormScreen = ({ route, navigation }: any) => {
  const editItem = route.params?.item as HasilSO | undefined;
  const accItem = route.params?.accItem as RefAccounting | undefined;

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<RefAccounting[]>([]);
  const [accData, setAccData] = useState<RefAccounting[]>([]);
  const [linkedAccounting, setLinkedAccounting] = useState<RefAccounting | null>(null);

  // Multi-quantity
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState('1');

  // Batch photo flow
  const [batchPhotoVisible, setBatchPhotoVisible] = useState(false);
  const [savedAssetNumbers, setSavedAssetNumbers] = useState<string[]>([]);

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
      setQty(1);
      setQtyText('1');
      if (editItem.ref_accounting_id) {
        setLinkedAccounting({
          id: editItem.ref_accounting_id,
          nama_accounting: editItem.nama_accounting || '',
          no_invoice: editItem.no_invoice,
        } as RefAccounting);
      }
    } else if (accItem) {
      handleSelectAccounting(accItem);
      initNewForm();
    } else {
      initNewForm();
    }
  }, [editItem, accItem]);

  const loadAccData = async () => {
    const data = await accountingService.getAll();
    setAccData(data);
  };

  const initNewForm = async () => {
    const nextNo = await generateNextAssetNumber();
    setForm(prev => ({ ...prev, no_asset: nextNo }));
  };

  // --- Suggestion: live search dari accData saat user ketik ---
  const handleNameChange = (text: string) => {
    // Update field nama_lapangan
    setForm(prev => ({ ...prev, nama_lapangan: text }));

    // Recompute status_match jika sudah ada linked accounting
    if (linkedAccounting) {
      const newMatch = computeStatusMatch(text, linkedAccounting.nama_accounting);
      setForm(prev => ({ ...prev, nama_lapangan: text, status_match: newMatch }));
    }

    // Tampilkan suggestion mulai 1 karakter (null-safe)
    if (text.length >= 1) {
      const lower = text.toLowerCase();
      const filtered = accData
        .filter(item =>
          item.nama_accounting != null &&
          String(item.nama_accounting).toLowerCase().includes(lower)
        )
        .slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // --- Foto: ambil kamera, simpan ke galeri + documentDirectory ---
  const handlePickImage = async () => {
    // 1. Minta permission media library
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

    // 2. Buka kamera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled) return;

    const tempUri = result.assets[0].uri;
    const noAsset = form.no_asset || 'temp';

    try {
      // 3. Simpan ke documentDirectory agar tidak hilang (persistent)
      const photoDir = FileSystem.documentDirectory + 'photos/';
      const dirInfo = await FileSystem.getInfoAsync(photoDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
      }

      const ext = tempUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${noAsset}_${Date.now()}.${ext}`;
      const persistentUri = photoDir + fileName;

      await FileSystem.copyAsync({ from: tempUri, to: persistentUri });

      // 4. Simpan ke Galeri HP (album 'Daelim SO')
      // copyAsset=true → Android COPY file ke album (tidak minta izin modify) ✅
      if (mediaStatus === 'granted') {
        try {
          const asset = await MediaLibrary.createAssetAsync(persistentUri);
          await MediaLibrary.createAlbumAsync('Daelim SO', asset, true);
          console.log('[Photo] Saved to gallery album: Daelim SO');
        } catch (galleryErr) {
          console.warn('[Photo] Gagal simpan ke galeri:', galleryErr);
        }
      }

      // 5. Update form dengan path persistent
      setForm(prev => ({ ...prev, foto_path: persistentUri }));
      console.log('[Photo] Saved to:', persistentUri);
    } catch (err: any) {
      console.warn('[Photo] Error simpan foto:', err);
      // Fallback: pakai URI temp (mungkin hilang setelah app restart)
      setForm(prev => ({ ...prev, foto_path: tempUri }));
    }
  };

  // --- Status match logic ---
  const computeStatusMatch = (lapanganName: string, accName: string): HasilSO['status_match'] => {
    if (!accName) return 'BARU';
    if (!lapanganName) return 'BEDA_NAMA';
    return lapanganName.trim().toLowerCase() === accName.trim().toLowerCase() ? 'MATCH' : 'BEDA_NAMA';
  };

  // --- Pilih dari accounting (suggestion atau modal) ---
  const handleSelectAccounting = (acc: RefAccounting) => {
    setLinkedAccounting(acc);

    // Selalu pakai nama accounting saat user memilih dari suggestion/modal.
    // Jika nama sama persis → MATCH, jika beda → user bisa edit manual → BEDA_NAMA.
    const accNama = acc.nama_accounting?.trim() || '';
    const matchStatus = computeStatusMatch(accNama, accNama); // default MATCH

    setForm(prev => ({
      ...prev,
      nama_lapangan: accNama,            // ← SELALU isi dengan nama accounting
      ref_accounting_id: acc.id,
      nama_accounting: acc.nama_accounting,
      // Auto-fill field kosong dari data accounting
      spesifikasi: prev.spesifikasi?.trim() ? prev.spesifikasi : (acc.spesifikasi || ''),
      pembuat:     prev.pembuat?.trim()     ? prev.pembuat     : (acc.pembuat     || ''),
      daya_kw:     prev.daya_kw?.trim()     ? prev.daya_kw     : (acc.daya_kw     || ''),
      tahun_buat:  prev.tahun_buat?.trim()  ? prev.tahun_buat  : (acc.tahun_buat  || ''),
      tahun_beli:  prev.tahun_beli?.trim()  ? prev.tahun_beli  : (acc.tahun_beli  || ''),
      no_invoice:  prev.no_invoice?.trim()  ? prev.no_invoice  : (acc.no_invoice  || ''),
      departemen:  prev.departemen?.trim()  ? prev.departemen  : (acc.departemen  || ''),
      status_match: matchStatus,
    }));
    setSuggestions([]);
    setModalVisible(false);
  };

  const handleRemoveMapping = () => {
    setLinkedAccounting(null);
    setForm(prev => ({
      ...prev,
      ref_accounting_id: undefined,
      nama_accounting: undefined,
      status_match: 'BARU',
    }));
  };

  const updateField = (field: keyof HasilSO) => (value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'nama_lapangan' && linkedAccounting) {
        updated.status_match = computeStatusMatch(value, linkedAccounting.nama_accounting);
      }
      return updated;
    });
  };

  // --- Qty handler ---
  const handleQtyChange = (text: string) => {
    setQtyText(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setQty(parsed);
    } else if (text === '') {
      setQty(1);
    }
  };

  const qtyValid = qty >= 1;
  const isBatchMode = qty > 1;

  // --- Simpan ---
  const handleSave = async (status: 'DRAFT' | 'FINAL') => {
    if (!form.nama_lapangan?.trim()) return Alert.alert('Error', 'Nama Mesin wajib diisi');
    if (!form.departemen?.trim()) return Alert.alert('Error', 'Departemen wajib diisi');
    if (!qtyValid) return Alert.alert('Error', 'Jumlah unit tidak valid');

    const confirmMsg = isBatchMode
      ? `Akan menyimpan ${qty} mesin dengan data yang sama (foto diisi nanti per unit). Lanjutkan?`
      : status === 'FINAL'
      ? 'Status FINAL tidak bisa diedit kembali. Lanjutkan?'
      : null;

    if (confirmMsg) {
      Alert.alert('Konfirmasi', confirmMsg, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Lanjutkan', onPress: () => doSave(status) },
      ]);
      return;
    }

    await doSave(status);
  };

  const doSave = async (status: 'DRAFT' | 'FINAL') => {
    setLoading(true);
    try {
      if (isBatchMode) {
        // --- BATCH SAVE: simpan N rows berurutan ---
        const saved = await hasilSoService.saveBatch(form, qty, status);
        setLoading(false);
        setSavedAssetNumbers(saved);
        setBatchPhotoVisible(true); // Buka flow foto sequential
      } else {
        // --- SINGLE SAVE ---
        let noAsset = form.no_asset;
        if (!noAsset) {
          noAsset = await generateNextAssetNumber();
        }
        const dataToSave = { ...form, no_asset: noAsset, status_so: status } as HasilSO;
        await hasilSoService.saveHasil(dataToSave);
        setLoading(false);
        navigation.goBack();
      }
    } catch (error: any) {
      setLoading(false);
      console.error('[SOForm] save error:', error?.message || error);
      Alert.alert('Error', 'Gagal simpan: ' + (error?.message || String(error)));
    }
  };

  const handleBatchPhotoComplete = () => {
    setBatchPhotoVisible(false);
    navigation.goBack();
  };

  const getStatusMatchColor = (status: string) => {
    const colors: Record<string, string> = {
      MATCH: '#4CAF50',
      BEDA_NAMA: '#FF9800',
      BARU: '#1565C0',
      TIDAK_ADA_FISIK: '#F44336',
    };
    return colors[status] || undefined;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* === FOTO === */}
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={!isBatchMode ? handlePickImage : undefined}
          activeOpacity={isBatchMode ? 1 : 0.7}
        >
          {isBatchMode ? (
            <View style={styles.photoPlaceholder}>
              <IconButton icon="camera-burst" size={40} iconColor="#1565C0" />
              <Text style={{ color: '#1565C0', fontWeight: '600' }}>
                Foto akan diambil per unit
              </Text>
              <Text variant="bodySmall" style={{ color: '#757575', textAlign: 'center' }}>
                Setelah simpan, sistem akan memandu{'\n'}foto satu per satu ({qty} unit)
              </Text>
            </View>
          ) : form.foto_path ? (
            <>
              <Image source={{ uri: form.foto_path }} style={styles.photo} />
              <TouchableOpacity style={styles.retakeOverlay} onPress={handlePickImage}>
                <Text style={styles.retakeText}>🔄 Foto Ulang</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconButton icon="camera" size={40} iconColor="#757575" />
              <Text style={{ color: '#757575' }}>Ambil Foto Mesin</Text>
              <Text variant="bodySmall" style={{ color: '#bbb' }}>Tap untuk buka kamera</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* === NO ASSET & QTY === */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.noAssetRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.noAssetLabel}>No Asset</Text>
                <Text variant="bodyMedium" style={styles.noAssetValue}>
                  {isBatchMode
                    ? `${form.no_asset} — AST-????`
                    : form.no_asset || 'Auto Generate'}
                </Text>
              </View>
              <View style={styles.qtyContainer}>
                <Text variant="bodySmall" style={styles.qtyLabel}>Jumlah Unit</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      const newQty = Math.max(1, qty - 1);
                      setQty(newQty);
                      setQtyText(String(newQty));
                    }}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={qtyText}
                    onChangeText={handleQtyChange}
                    keyboardType="number-pad"
                    mode="outlined"
                    style={styles.qtyInput}
                    dense
                  />
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      const newQty = qty + 1;
                      setQty(newQty);
                      setQtyText(String(newQty));
                    }}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {isBatchMode && (
              <View style={styles.batchNotice}>
                <Text style={styles.batchNoticeText}>
                  📦 Mode Batch: {qty} mesin akan disimpan dengan data yang sama
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* === DATA LAPANGAN === */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>DATA LAPANGAN</Text>

            {/* Nama Mesin + Suggestion */}
            <TextInput
              label="Nama Mesin (Lapangan)*"
              value={form.nama_lapangan}
              onChangeText={handleNameChange}
              mode="outlined"
              style={styles.input}
              returnKeyType="next"
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                <Text variant="bodySmall" style={styles.suggestionHeader}>
                  💡 Cocokkan dengan data Accounting:
                </Text>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectAccounting(item)}
                    style={[
                      styles.suggestionItem,
                      idx === suggestions.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName}>{item.nama_accounting}</Text>
                      <Text variant="bodySmall" style={styles.suggestionDetail}>
                        {[
                          item.spesifikasi,
                          item.daya_kw ? `${item.daya_kw} Kw` : '',
                          item.departemen,
                          item.no_invoice,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Text>
                    </View>
                    {item.is_verified === 1 && (
                      <Badge style={{ backgroundColor: '#FF9800' }}>SO</Badge>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.row}>
              <TextInput
                label="Spesifikasi"
                value={form.spesifikasi}
                onChangeText={updateField('spesifikasi')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
              <TextInput
                label="Merk/Pembuat"
                value={form.pembuat}
                onChangeText={updateField('pembuat')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Daya (Kw)"
                value={form.daya_kw}
                onChangeText={updateField('daya_kw')}
                mode="outlined"
                style={[styles.input, styles.half]}
                keyboardType="decimal-pad"
              />
              <TextInput
                label="Tahun Buat"
                value={form.tahun_buat}
                onChangeText={updateField('tahun_buat')}
                mode="outlined"
                style={[styles.input, styles.half]}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Tahun Beli"
                value={form.tahun_beli}
                onChangeText={updateField('tahun_beli')}
                mode="outlined"
                style={[styles.input, styles.half]}
                keyboardType="number-pad"
              />
              <TextInput
                label="No Invoice"
                value={form.no_invoice}
                onChangeText={updateField('no_invoice')}
                mode="outlined"
                style={[styles.input, styles.half]}
              />
            </View>

            <TextInput
              label="Departemen*"
              value={form.departemen}
              onChangeText={updateField('departemen')}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodyMedium" style={styles.radioLabel}>Status Pengadaan</Text>
            <RadioButton.Group
              onValueChange={v =>
                setForm(prev => ({ ...prev, status_pengadaan: v as 'Beli' | 'Buat Sendiri' }))
              }
              value={form.status_pengadaan || 'Beli'}
            >
              <View style={styles.radioRow}>
                <RadioButton.Item label="Beli" value="Beli" />
                <RadioButton.Item label="Buat Sendiri" value="Buat Sendiri" />
              </View>
            </RadioButton.Group>

            <TextInput
              label="Catatan"
              value={form.catatan}
              onChangeText={updateField('catatan')}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* === MAPPING ACCOUNTING === */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>MAPPING ACCOUNTING</Text>

            {linkedAccounting ? (
              <View style={styles.mappedBox}>
                <View style={styles.mappedHeader}>
                  <Badge style={styles.mappedBadge}>✅ TERHUBUNG</Badge>
                  <IconButton icon="close" size={20} onPress={handleRemoveMapping} />
                </View>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                  {linkedAccounting.nama_accounting}
                </Text>
                <Text variant="bodySmall" style={{ color: '#757575' }}>
                  Invoice: {linkedAccounting.no_invoice || '-'} · Dept: {linkedAccounting.departemen || '-'}
                </Text>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="link"
                onPress={() => setModalVisible(true)}
                style={styles.linkBtn}
              >
                Cari &amp; Hubungkan ke Data Accounting
              </Button>
            )}

            <Divider style={styles.divider} />

            <Text variant="bodyMedium" style={styles.radioLabel}>Status Match</Text>
            <RadioButton.Group
              onValueChange={v =>
                setForm(prev => ({ ...prev, status_match: v as HasilSO['status_match'] }))
              }
              value={form.status_match || 'BARU'}
            >
              {[
                { label: 'MATCH — Nama sama persis', value: 'MATCH' },
                { label: 'BEDA NAMA — Sudah dimapping', value: 'BEDA_NAMA' },
                { label: 'BARU — Tidak ada di Accounting', value: 'BARU' },
                { label: 'TIDAK ADA FISIK — Ada di Acc, tidak ada di lapangan', value: 'TIDAK_ADA_FISIK' },
              ].map(opt => (
                <RadioButton.Item
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  labelStyle={{
                    color:
                      form.status_match === opt.value
                        ? getStatusMatchColor(opt.value)
                        : undefined,
                    fontWeight: form.status_match === opt.value ? '700' : 'normal',
                  }}
                />
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* === FOOTER BUTTONS === */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={() => handleSave('DRAFT')}
            disabled={loading}
            icon="content-save"
            style={{ flex: 1, marginRight: 8 }}
          >
            {isBatchMode ? `Draft ${qty}x` : 'Simpan Draft'}
          </Button>
          <Button
            mode="contained"
            onPress={() => handleSave('FINAL')}
            loading={loading}
            disabled={loading}
            icon="check"
            style={{ flex: 1, marginLeft: 8, backgroundColor: '#1565C0' }}
          >
            {isBatchMode ? `Final ${qty}x` : 'Simpan Final'}
          </Button>
        </View>
      </ScrollView>

      {/* Modal cari accounting */}
      <AccountingSearchModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSelect={handleSelectAccounting}
      />

      {/* Flow foto sequential setelah batch save */}
      <BatchPhotoFlow
        visible={batchPhotoVisible}
        assetNumbers={savedAssetNumbers}
        onComplete={handleBatchPhotoComplete}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Foto
  photoContainer: {
    height: 180,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', gap: 4 },
  retakeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  retakeText: { color: '#fff', fontSize: 12 },

  // No asset & Qty
  card: { margin: 10, marginBottom: 4, elevation: 2 },
  noAssetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noAssetLabel: { color: '#757575' },
  noAssetValue: { color: '#1565C0', fontWeight: 'bold', fontSize: 15 },
  qtyContainer: { alignItems: 'flex-end' },
  qtyLabel: { color: '#757575', marginBottom: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  qtyInput: { width: 52, textAlign: 'center', backgroundColor: '#fff', height: 36 },
  batchNotice: {
    marginTop: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  batchNoticeText: { color: '#E65100', fontSize: 13 },

  // Form
  sectionTitle: { color: '#1565C0', fontWeight: 'bold', marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  radioLabel: { marginTop: 8, marginBottom: 2, fontWeight: '600' },
  radioRow: { flexDirection: 'row', alignItems: 'center' },

  // Suggestion
  suggestionBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 4,
  },
  suggestionHeader: {
    color: '#1565C0',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionContent: { flex: 1 },
  suggestionName: { fontWeight: '600', color: '#1a1a1a' },
  suggestionDetail: { color: '#757575', marginTop: 2 },

  // Mapping
  mappedBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  mappedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mappedBadge: { backgroundColor: '#4CAF50', alignSelf: 'flex-start' },
  linkBtn: { borderColor: '#1565C0', marginVertical: 4 },
  divider: { marginVertical: 12 },

  // Footer
  footer: { flexDirection: 'row', padding: 15, paddingTop: 8 },
});

export default SOFormScreen;
