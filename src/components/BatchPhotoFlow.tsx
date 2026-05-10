import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Text, Button, IconButton, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { hasilSoService } from '../api/hasilSoService';

interface Props {
  visible: boolean;
  assetNumbers: string[]; // array no_asset yang baru disimpan (AST-0001, AST-0002, dst)
  onComplete: () => void; // dipanggil setelah semua foto selesai atau skip
}

/**
 * BatchPhotoFlow
 * Modal sequential untuk mengambil foto satu per satu setelah batch save.
 * User difoto-in unit 1/N → unit 2/N → dst, atau bisa skip semua.
 */
const BatchPhotoFlow = ({ visible, assetNumbers, onComplete }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = assetNumbers.length;
  const currentAsset = assetNumbers[currentIndex];
  const progress = total > 0 ? currentIndex / total : 0;

  const handleTakePhoto = async () => {
    // Minta permission gallery
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled) return;
    const tempUri = result.assets[0].uri;

    try {
      // Simpan ke documentDirectory (persistent)
      const photoDir = FileSystem.documentDirectory + 'photos/';
      const dirInfo = await FileSystem.getInfoAsync(photoDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
      }
      const ext = tempUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${currentAsset}_${Date.now()}.${ext}`;
      const persistentUri = photoDir + fileName;
      await FileSystem.copyAsync({ from: tempUri, to: persistentUri });

      // Simpan ke galeri album 'Daelim SO' (copyAsset=true = tidak minta izin modify)
      if (mediaStatus === 'granted') {
        try {
          const galleryAsset = await MediaLibrary.createAssetAsync(persistentUri);
          await MediaLibrary.createAlbumAsync('Daelim SO', galleryAsset, true);
        } catch (e) {
          console.warn('[BatchPhoto] Gagal simpan ke galeri:', e);
        }
      }

      setCurrentPhoto(persistentUri);
    } catch (err) {
      console.warn('[BatchPhoto] Error simpan foto, fallback ke temp:', err);
      setCurrentPhoto(tempUri);
    }
  };

  const handleSaveAndNext = async () => {
    if (!currentPhoto) {
      // Skip foto untuk unit ini
      goNext();
      return;
    }
    setSaving(true);
    try {
      await hasilSoService.updateFoto(currentAsset, currentPhoto);
    } catch (e) {
      console.warn('[BatchPhoto] gagal simpan foto:', e);
    }
    setSaving(false);
    goNext();
  };

  const goNext = () => {
    setCurrentPhoto(null);
    if (currentIndex + 1 >= total) {
      // Semua selesai
      setCurrentIndex(0);
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkipAll = () => {
    Alert.alert(
      'Skip Semua Foto?',
      'Foto bisa ditambahkan nanti dengan membuka form edit masing-masing aset.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Skip Semua',
          onPress: () => {
            setCurrentIndex(0);
            setCurrentPhoto(null);
            onComplete();
          },
        },
      ]
    );
  };

  if (!visible || total === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            📷 Foto Mesin
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Unit {currentIndex + 1} dari {total}
          </Text>
        </View>

        {/* Progress bar */}
        <ProgressBar progress={progress} color="#1565C0" style={styles.progress} />

        {/* No Asset label */}
        <View style={styles.assetLabel}>
          <Text variant="bodySmall" style={styles.assetNo}>
            No Asset: <Text style={styles.assetNoValue}>{currentAsset}</Text>
          </Text>
        </View>

        {/* Area foto */}
        <TouchableOpacity style={styles.photoArea} onPress={handleTakePhoto}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconButton icon="camera" size={60} iconColor="#1565C0" />
              <Text style={styles.photoHint}>Tap untuk ambil foto</Text>
              <Text variant="bodySmall" style={styles.photoHintSub}>
                Arahkan kamera ke mesin unit {currentIndex + 1}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Retake jika sudah ada foto */}
        {currentPhoto && (
          <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
            <Text style={styles.retakeText}>🔄 Foto Ulang</Text>
          </TouchableOpacity>
        )}

        {/* Tombol aksi */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={goNext}
            style={styles.skipBtn}
            disabled={saving}
          >
            Skip Unit Ini
          </Button>
          <Button
            mode="contained"
            onPress={handleSaveAndNext}
            loading={saving}
            disabled={saving}
            style={styles.nextBtn}
            buttonColor="#1565C0"
          >
            {currentIndex + 1 >= total
              ? '✓ Selesai'
              : `Simpan & Unit ${currentIndex + 2}`}
          </Button>
        </View>

        {/* Skip semua */}
        <TouchableOpacity style={styles.skipAllBtn} onPress={handleSkipAll}>
          <Text style={styles.skipAllText}>Lewati semua foto →</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#BBDEFB',
    marginTop: 4,
  },
  progress: {
    height: 6,
    backgroundColor: '#BBDEFB',
  },
  assetLabel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E3F2FD',
  },
  assetNo: {
    color: '#555',
  },
  assetNoValue: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  photoArea: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BBDEFB',
    borderStyle: 'dashed',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  photoHint: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '600',
    marginTop: 8,
  },
  photoHintSub: {
    color: '#757575',
    marginTop: 4,
  },
  retakeBtn: {
    alignSelf: 'center',
    marginBottom: 8,
    padding: 8,
  },
  retakeText: {
    color: '#1565C0',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    borderColor: '#1565C0',
  },
  nextBtn: {
    flex: 2,
  },
  skipAllBtn: {
    alignSelf: 'center',
    padding: 12,
    marginBottom: 20,
  },
  skipAllText: {
    color: '#9E9E9E',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

export default BatchPhotoFlow;
