import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { useSyncStore } from '../../src/store/syncStore';
import colors from '../../src/theme/colors';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useUIStore();
  const { isOnline, isSyncing, pendingCount, lastSyncAt, syncNow } = useSyncStore();

  const lastSyncDisplay = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('en-IN')
    : 'Never';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user?.name?.[0] ?? 'U'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Language toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LANGUAGE</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Use Tamil</Text>
            <Switch
              value={language === 'ta'}
              onValueChange={(v) => setLanguage(v ? 'ta' : 'en')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Sync status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNC</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Status</Text>
              <Text style={[styles.rowSub, { color: isOnline ? colors.success : colors.danger }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Pending</Text>
              <Text style={styles.rowSub}>{pendingCount} items</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Last sync</Text>
              <Text style={styles.rowSub}>{lastSyncDisplay}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncBtn, (!isOnline || isSyncing) && styles.syncBtnDisabled]}
            onPress={syncNow}
            disabled={!isOnline || isSyncing}
            accessibilityLabel="Sync now"
          >
            <Ionicons name="sync-outline" size={18} color={colors.textInverse} />
            <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: { fontSize: 24, fontWeight: '800', color: colors.textInverse },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  profileEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profileRole: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '700',
    marginTop: 4,
    backgroundColor: colors.primaryPale,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#f5c6c6',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});
