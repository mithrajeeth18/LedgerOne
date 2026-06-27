import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../src/theme/colors';

export default function ForgotPinScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="lock-open-outline" size={64} color={colors.primary} />
        <Text style={styles.title}>Reset PIN</Text>
        <Text style={styles.body}>
          To reset your PIN, contact your administrator. They can update your credentials
          through the admin panel.
        </Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primaryLight} />
          <Text style={styles.infoText}>
            For security reasons, PIN resets are only available through the admin.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityLabel="Back to login"
        >
          <Text style={styles.backBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: { padding: 20 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
    marginTop: -60,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.primary },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primaryPale,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  backBtnText: { color: colors.textInverse, fontSize: 16, fontWeight: '700' },
});
