import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import '../src/i18n';
import { useAuthStore } from '../src/store/authStore';
import { useSyncStore } from '../src/store/syncStore';
import { useUIStore } from '../src/store/uiStore';
import colors from '../src/theme/colors';
import NewCustomerToast from '../src/components/NewCustomerToast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000,   // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadStoredSession = useAuthStore((s) => s.loadStoredSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const startNetworkWatch = useSyncStore((s) => s.startNetworkWatch);
  const loadLanguage = useUIStore((s) => s.loadLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadLanguage();
      await loadStoredSession();
      setIsReady(true);
      SplashScreen.hideAsync();
    };
    init();
    const unsubscribe = startNetworkWatch();
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      // Force user back to login screen on token expiry / logout
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isReady]);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
