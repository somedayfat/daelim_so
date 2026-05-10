import React, { useEffect, useState } from 'react';
import { PaperProvider, MD3LightTheme, ActivityIndicator, Text, Button } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/api/database';
import DashboardScreen from './src/screens/DashboardScreen';
import SOListScreen from './src/screens/SOListScreen';
import SOFormScreen from './src/screens/SOFormScreen';
import RekapScreen from './src/screens/RekapScreen';
import { View } from 'react-native';

const Stack = createNativeStackNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    secondary: '#003c8f',
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e: any) {
        console.warn('Database init error:', e);
        setDbError('Gagal inisialisasi database: ' + (e?.message || 'Unknown'));
        return;
      }
      setIsReady(true);
    }
    prepare();
  }, []);

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
        <Text variant="titleMedium" style={{ color: '#F44336', textAlign: 'center', marginBottom: 16 }}>{dbError}</Text>
        <Button mode="contained" onPress={() => { setDbError(null); initDatabase().then(() => setIsReady(true)).catch(e => setDbError(e?.message)); }}>
          Coba Lagi
        </Button>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={{ marginTop: 10 }}>Inisialisasi Aplikasi...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Dashboard"
          screenOptions={{
            headerStyle: { backgroundColor: '#1565C0' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Daelim SO Apps' }} />
          <Stack.Screen name="SOList" component={SOListScreen} options={{ title: 'Daftar SO' }} />
          <Stack.Screen name="SOForm" component={SOFormScreen} options={{ title: 'Form SO' }} />
          <Stack.Screen name="Rekap" component={RekapScreen} options={{ title: 'Rekap & Export' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
