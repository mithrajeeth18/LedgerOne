import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import colors from '../../src/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !pin.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and PIN.');
      return;
    }
    await login({ email: email.trim().toLowerCase(), pin });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo / Branding */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>₹</Text>
          </View>
          <Text style={styles.appName}>LedgerOne</Text>
          <Text style={styles.tagline}>Smart lending, simplified.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError} accessibilityLabel="Dismiss error">
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="collector@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            accessibilityLabel="Email input"
          />

          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter your PIN"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            accessibilityLabel="PIN input"
          />

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="Login button"
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.loginBtnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/(auth)/forgot-pin')}
            accessibilityLabel="Forgot PIN"
          >
            <Text style={styles.forgotLinkText}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  brand: { alignItems: 'center', marginBottom: 44 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: colors.textInverse },
  appName: { fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  form: { gap: 12 },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    marginBottom: 4,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: -4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 56,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 58,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: colors.textInverse, fontSize: 17, fontWeight: '800' },
  forgotLink: { alignItems: 'center', paddingVertical: 8 },
  forgotLinkText: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
});
