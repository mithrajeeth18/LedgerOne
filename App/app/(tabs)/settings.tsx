import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { useSyncStore } from '../../src/store/syncStore';
import colors from '../../src/theme/colors';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuthStore();
  const { language, setLanguage } = useUIStore();
  const { isOnline, isSyncing, syncNow } = useSyncStore();

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleLanguageSelect = (lang: 'en' | 'ta') => {
    setLanguage(lang);
    setLangModalVisible(false);
  };

  const getLanguageLabel = () => {
    return language === 'ta' ? 'தமிழ்' : 'English (US)';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Security & Access ── */}
        <Text style={styles.sectionHeader}>{t('settings.securityAccess')}</Text>
        <View style={styles.card}>
          {/* Row 1: Change PIN */}
          <TouchableOpacity 
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => alert('Change PIN feature is not configured.')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={22} color="#0b4619" />
              <Text style={styles.rowLabel}>{t('settings.changePin')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 2: Biometric Login */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="finger-print-outline" size={22} color="#0b4619" />
              <View style={styles.textGroup}>
                <Text style={styles.rowLabel}>{t('settings.biometricLogin')}</Text>
                <Text style={styles.rowSubtitle}>{t('settings.useBiometric')}</Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ true: '#0b4619', false: colors.outlineVariant }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.outlineVariant}
            />
          </View>
        </View>

        {/* ── Section 2: Preferences ── */}
        <Text style={styles.sectionHeader}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          {/* Row 1: Language */}
          <TouchableOpacity 
            style={styles.row} 
            activeOpacity={0.8}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={22} color="#0b4619" />
              <View style={styles.textGroup}>
                <Text style={styles.rowLabel}>{t('settings.language')}</Text>
                <Text style={[styles.rowSubtitle, { color: '#0b4619', fontWeight: '800' }]}>
                  {getLanguageLabel()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Section 3: System ── */}
        <Text style={styles.sectionHeader}>{t('settings.system')}</Text>
        <View style={styles.card}>
          {/* Row 1: App Version */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#0b4619" />
              <Text style={styles.rowLabel}>{t('settings.appVersion')}</Text>
            </View>
            <Text style={styles.versionValue}>v4.2.1-prod</Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Row 2: Database Sync */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="sync-outline" size={22} color="#0b4619" />
              <View style={styles.textGroup}>
                <Text style={styles.rowLabel}>{t('settings.databaseSync')}</Text>
                <Text style={[
                  styles.rowSubtitle, 
                  { color: isOnline ? '#15803d' : colors.statusPending, fontWeight: '700' }
                ]}>
                  {isOnline ? t('settings.upToDate') : t('settings.offline')}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.syncBtn, (!isOnline || isSyncing) && styles.syncBtnDisabled]} 
              onPress={syncNow}
              disabled={!isOnline || isSyncing}
              activeOpacity={0.85}
            >
              <Text style={styles.syncBtnText}>
                {isSyncing ? t('settings.syncing').toUpperCase() : t('settings.syncNow').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={logout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutBtnText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            
            <TouchableOpacity 
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                English (US)
              </Text>
              {language === 'en' && <Ionicons name="checkmark-circle" size={20} color="#0b4619" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langOption, language === 'ta' && styles.langOptionActive]}
              onPress={() => handleLanguageSelect('ta')}
            >
              <Text style={[styles.langOptionText, language === 'ta' && styles.langOptionTextActive]}>
                தமிழ் (Tamil)
              </Text>
              {language === 'ta' && <Ionicons name="checkmark-circle" size={20} color="#0b4619" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf3', // Beige/green sunlight-safe background
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest, // solid white background
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  rowDivider: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  textGroup: {
    flexDirection: 'column',
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  syncBtn: {
    backgroundColor: '#0b4619', // Solid green background
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  syncBtnDisabled: {
    backgroundColor: colors.outlineVariant,
    borderColor: colors.outlineVariant,
  },
  syncBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Logout button
  logoutBtn: {
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: '#dc2626', // Solid red outline
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Language Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 6,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
  },
  langOptionActive: {
    borderColor: '#0b4619',
    backgroundColor: '#ecfdf5',
  },
  langOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langOptionTextActive: {
    color: '#0b4619',
    fontWeight: '800',
  },
});
