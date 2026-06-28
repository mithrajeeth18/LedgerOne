import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import colors from '../../src/theme/colors';

const BIOMETRIC_ENABLED_KEY = 'biometricsEnabled';
const BIOMETRIC_EMAIL_KEY = 'biometricEmail';
const BIOMETRIC_PASSWORD_KEY = 'biometricPassword';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(false);
  const [showBioCard, setShowBioCard] = useState(true);
  const { login, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supported = hasHardware && isEnrolled;
    setIsBioSupported(supported);

    if (supported) {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      if (enabled === 'true') {
        setIsBioEnabled(true);
        setShowBioCard(false); // No need to show promo card if already enabled
        // Auto-trigger biometric authentication on mount
        triggerBiometricLogin();
      }
    }
  };

  const triggerBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LedgerOne securely',
        fallbackLabel: 'Use password instead',
      });

      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
        const savedPassword = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

        if (savedEmail && savedPassword) {
          await login({ email: savedEmail, password: savedPassword });
        } else {
          Alert.alert('Error', 'Saved credentials not found. Please log in with password.');
        }
      }
    } catch (err) {
      console.error('[Biometric] Auth error:', err);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    await login({ email: email.trim().toLowerCase(), password });
  };

  const handleEnableBiometrics = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Credentials Required',
        'Please type your email and password first, then press "ENABLE NOW" to link them with biometrics.'
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to enable Biometric Login',
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email.trim().toLowerCase());
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
        setIsBioEnabled(true);
        Alert.alert('Success', 'Biometric login enabled successfully! Next time you can log in using your fingerprint/face.');
      } else {
        Alert.alert('Cancelled', 'Biometric verification failed.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not configure biometrics.');
    }
  };

  const handleMaybeLater = () => {
    setShowBioCard(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar: SECURE ACCESS */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>SECURE ACCESS</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* Visual Anchor / Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Ionicons name="shield-half" size={40} color={colors.white} />
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
                <Text style={styles.errorText}>{error}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="collector.id@agency.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SECURE PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <View style={styles.forgotContainer}>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-pin')}>
                  <Text style={styles.forgotText}>Forgot Access?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Text style={styles.loginBtnText}>SIGN IN</Text>
                  <Ionicons name="log-in-outline" size={20} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* Biometric trigger button if already enabled */}
            {isBioSupported && isBioEnabled && (
              <TouchableOpacity style={styles.bioTriggerBtn} onPress={triggerBiometricLogin}>
                <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
                <Text style={styles.bioTriggerText}>Login with Biometrics</Text>
              </TouchableOpacity>
            )}

            {/* Biometric Promotion Card */}
            {isBioSupported && !isBioEnabled && showBioCard && (
              <View style={styles.promoCard}>
                <View style={styles.promoHeader}>
                  <Ionicons name="finger-print" size={32} color={colors.primary} />
                  <View style={styles.promoTextContainer}>
                    <Text style={styles.promoTitle}>Enable Biometric Login?</Text>
                    <Text style={styles.promoSubtitle}>
                      Use fingerprint or face unlock for faster access next time.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.promoBtnPrimary} onPress={handleEnableBiometrics}>
                  <Text style={styles.promoBtnPrimaryText}>ENABLE NOW</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.promoBtnSecondary} onPress={handleMaybeLater}>
                  <Text style={styles.promoBtnSecondaryText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* System Integrity Notice */}
          <View style={styles.integrityContainer}>
            <View style={styles.integrityHeader}>
              <Ionicons name="lock-closed" size={12} color={colors.statusPaid} />
              <Text style={styles.integrityText}>ENCRYPTED END-TO-END</Text>
            </View>
            <View style={styles.integrityBarContainer}>
              <View style={styles.integrityBar} />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: 16,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  input: {
    height: 64,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 16,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  loginBtn: {
    height: 64,
    backgroundColor: colors.statusPaid,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bioTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    marginTop: 4,
  },
  bioTriggerText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  promoCard: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    padding: 20,
    marginTop: 24,
    gap: 16,
  },
  promoHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  promoTextContainer: {
    flex: 1,
    gap: 4,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  promoSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  promoBtnPrimary: {
    height: 48,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnPrimaryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  promoBtnSecondary: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnSecondaryText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderColor: colors.statusPending,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: colors.statusPending,
    fontWeight: '600',
    fontSize: 13,
  },
  integrityContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    marginBottom: 16,
  },
  integrityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  integrityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  integrityBarContainer: {
    width: 120,
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  integrityBar: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.statusPaid,
  },
});
