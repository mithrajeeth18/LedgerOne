import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../src/theme/colors';

export default function BiometricScreen() {
  const [supported, setSupported] = useState(false);

  const checkSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setSupported(compatible && enrolled);
  };

  const authenticate = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Use fingerprint or face to unlock LedgerOne',
      fallbackLabel: 'Use PIN instead',
    });
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Authentication failed', 'Please try again or use your PIN.');
    }
  };

  useEffect(() => {
    checkSupport();
    authenticate();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="finger-print" size={72} color={colors.primary} />
        </View>
        <Text style={styles.title}>Biometric Login</Text>
        <Text style={styles.subtitle}>
          {supported
            ? 'Use your fingerprint or face ID to unlock the app.'
            : 'Biometrics not available on this device.'}
        </Text>

        {supported && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={authenticate}
            accessibilityLabel="Retry biometric authentication"
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.pinLink}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityLabel="Use PIN instead"
        >
          <Text style={styles.pinLinkText}>Use PIN instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 16 },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  retryBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
  pinLink: { paddingVertical: 8 },
  pinLinkText: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
});
