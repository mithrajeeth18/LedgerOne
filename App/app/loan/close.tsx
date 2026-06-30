import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../../src/api/loans.api';
import { useDataStore } from '../../src/store/dataStore';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';

export default function CloseLoanScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { loanId, customerName, principalAmount, totalPaid } =
    useLocalSearchParams<{
      loanId: string;
      customerName: string;
      principalAmount: string;
      totalPaid: string;
    }>();

  const [closing, setClosing] = useState(false);

  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedTotalPaid = parseFloat(totalPaid) || 0;
  const remainingBalance = Math.max(0, parsedPrincipal - parsedTotalPaid);

  const handleCloseLoan = async () => {
    Alert.alert(
      t('closeLoanScreen.closeBtn'),
      `This will permanently close the loan for ${customerName}. The remaining balance of ${formatCurrency(remainingBalance)} will be settled. This action cannot be undone.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('closeLoanScreen.closeBtn'),
          style: 'destructive',
          onPress: async () => {
            setClosing(true);
            try {
              await loansApi.close(loanId);
              queryClient.invalidateQueries({ queryKey: ['customer_details'] });
              queryClient.invalidateQueries({ queryKey: ['groups'] });
              queryClient.invalidateQueries({ queryKey: ['payments', 'today'] });
              useDataStore.getState().invalidateCache();
              // Navigate back to customer profile — it will re-render with no active loan
              router.back();
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? 'Failed to close loan.';
              Alert.alert(t('common.error'), msg);
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('closeLoanScreen.title', { name: customerName?.toUpperCase() })}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Current Loan Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryHeaderText}>{t('closeLoanScreen.currentSummary')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('closeLoanScreen.originalAmount')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(parsedPrincipal)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('closeLoanScreen.paidToDate')}</Text>
            <Text style={[styles.summaryValue, { color: colors.statusPaid }]}>
              {formatCurrency(parsedTotalPaid)}
            </Text>
          </View>
        </View>

        {/* Remaining Balance Hero Block */}
        <View style={styles.balanceHero}>
          <Text style={styles.balanceHeroLabel}>{t('closeLoanScreen.remainingBalance')}</Text>
          <Text style={styles.balanceHeroAmount}>{formatCurrency(remainingBalance)}</Text>
          <Text style={styles.balanceHeroSub}>{t('closeLoanScreen.settlementDue')}</Text>
        </View>

        {/* Warning Card */}
        <View style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={20} color="#dc2626" />
            <Text style={styles.warningTitle}>{t('closeLoanScreen.importantNote')}</Text>
          </View>
          <Text style={styles.warningText}>
            {t('closeLoanScreen.warningText')}
          </Text>
        </View>

      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.closeBtn, closing && styles.closeBtnDisabled]}
          onPress={handleCloseLoan}
          disabled={closing}
        >
          {closing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.white} />
              <Text style={styles.closeBtnText}>{t('closeLoanScreen.closeBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderHeavy,
    backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },

  // Loan Summary Card
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 16,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },

  // Remaining Balance Hero
  balanceHero: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  balanceHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
    letterSpacing: 1.5,
  },
  balanceHeroAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  balanceHeroSub: {
    fontSize: 14,
    color: colors.onPrimaryContainer,
    fontWeight: '500',
  },

  // Warning Card
  warningCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: '#dc2626',
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 16,
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  closeBtn: {
    height: 60,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  closeBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  closeBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
