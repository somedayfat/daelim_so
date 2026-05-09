import React, { useEffect, useState } from 'react';
import { PaperProvider, MD3LightTheme, ActivityIndicator, Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initDatabase } from './src/api/database';
import DashboardScreen from './src/screens/DashboardScreen';
import ImportScreen from './src/screens/ImportScreen';
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

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e) {
        console.warn('Database init warning:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

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
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Asset Stock Opname' }} />
          <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'Import Data' }} />
          <Stack.Screen name="SOList" component={SOListScreen} options={{ title: 'Daftar SO' }} />
          <Stack.Screen name="SOForm" component={SOFormScreen} options={{ title: 'Form SO' }} />
          <Stack.Screen name="Rekap" component={RekapScreen} options={{ title: 'Rekap & Export' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
