import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';
import colors from '../../src/theme/colors';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { isOnline, pendingCount, lastSyncAt } = useSyncStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.userName}>{user?.name ?? 'Collector'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isOnline ? colors.successBg : colors.dangerBg }]}>
            <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.danger }]}>
              {isOnline ? '● Online' : '● Offline'}
            </Text>
          </View>
        </View>

        {/* Pending sync banner */}
        {pendingCount > 0 && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>
              {pendingCount} payment{pendingCount > 1 ? 's' : ''} pending sync
            </Text>
          </View>
        )}

        {/* Quick stats placeholder */}
        <View style={styles.statsGrid}>
          {['Total Groups', 'Active Loans', "Today's Collections", 'Overdue'].map((label) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },
  header: { gap: 4 },
  greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 28, color: colors.primary, fontWeight: '800', letterSpacing: -0.5 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  syncBanner: {
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  syncBannerText: { color: colors.warning, fontWeight: '600', fontSize: 14 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});
