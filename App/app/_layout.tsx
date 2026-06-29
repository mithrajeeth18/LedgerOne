import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import '../src/i18n';
import { useAuthStore } from '../src/store/authStore';
import { useSyncStore } from '../src/store/syncStore';
import colors from '../src/theme/colors';
import NewCustomerToast from '../src/components/NewCustomerToast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadStoredSession = useAuthStore((s) => s.loadStoredSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const startNetworkWatch = useSyncStore((s) => s.startNetworkWatch);

  useEffect(() => {
    const init = async () => {
      await loadStoredSession();
      SplashScreen.hideAsync();
    };
    init();
    const unsubscribe = startNetworkWatch();
    return () => { unsubscribe(); };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="customer/[id]" />
        <Stack.Screen name="loan/[id]" />
      </Stack>
      <NewCustomerToast />
    </GestureHandlerRootView>
  );
}
