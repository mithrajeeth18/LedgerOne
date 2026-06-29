import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { loansApi } from '../../src/api/loans.api';
import { useDataStore } from '../../src/store/dataStore';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';
import CalendarModal from '../../src/components/CalendarModal';

export default function RolloverLoanScreen() {
  const { t } = useTranslation();
  const { loanId, customerName, groupId, principalAmount, totalPaid } =
    useLocalSearchParams<{
      loanId: string;
      customerName: string;
      groupId: string;
      principalAmount: string;
      totalPaid: string;
    }>();

  const parsedPrincipal  = parseFloat(principalAmount) || 0;
  const parsedTotalPaid  = parseFloat(totalPaid) || 0;
  const carriedBalance   = Math.max(0, parsedPrincipal - parsedTotalPaid);

  // Form state
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [interestRate, setInterestRate]         = useState('12');
  const [durationDays, setDurationDays]         = useState('50');
  const [startDate, setStartDate]               = useState(() => {
    const today = new Date();
    const dd    = String(today.getDate()).padStart(2, '0');
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy  = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [submitting, setSubmitting]                   = useState(false);

  const today = useMemo(() => new Date(), []);

  // Live calculation
  const parsedAdditional  = parseFloat(additionalAmount) || 0;
  const parsedRate        = parseFloat(interestRate) || 0;
  const parsedDuration    = parseInt(durationDays, 10) || 0;

  const totalPrincipal    = carriedBalance + parsedAdditional; // ₹3k + ₹5k = ₹8k
  const interestAmount    = Math.round(totalPrincipal * (parsedRate / 100));
  const combinedPrincipal = totalPrincipal + interestAmount;
  const newDailyAmount    = parsedDuration > 0 ? Math.ceil(combinedPrincipal / parsedDuration) : 0;

  // Convert DD-MM-YYYY to ISO string for API
  const toISODate = (ddmmyyyy: string): string => {
    const [dd, mm, yyyy] = ddmmyyyy.split('-');
    return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)).toISOString();
  };

  const handleConfirm = async () => {
    if (parsedDuration <= 0) {
      Alert.alert(t('common.confirm'), 'Please enter a valid duration (days).');
      return;
    }
    if (parsedRate < 0) {
      Alert.alert(t('common.confirm'), 'Interest rate cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await loansApi.rollover(loanId, {
        newAmount:    parsedAdditional,
        interestRate: parsedRate,
        totalDays:    parsedDuration,
        startDate:    toISODate(startDate),
      });
      useDataStore.getState().invalidateCache();
      // Go back to customer profile — it will show the new active loan
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create rollover loan.';
      Alert.alert(t('common.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('rolloverScreen.title', { name: customerName?.toUpperCase() })}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            {t('rolloverScreen.banner')}
          </Text>
        </View>

        {/* Current Loan Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>{t('closeLoanScreen.currentSummary')}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>{t('closeLoanScreen.originalAmount')}</Text>
            <Text style={styles.summaryRowValue}>{formatCurrency(parsedPrincipal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>{t('closeLoanScreen.paidToDate')}</Text>
            <Text style={[styles.summaryRowValue, { color: colors.statusPaid }]}>
              {formatCurrency(parsedTotalPaid)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryRowLabel, { fontWeight: '800', color: colors.textPrimary }]}>
              {t('closeLoanScreen.remainingBalance')}
            </Text>
            <Text style={[styles.summaryRowValue, { fontWeight: '800', color: colors.textPrimary }]}>
              {formatCurrency(carriedBalance)}
            </Text>
          </View>
        </View>

        {/* New Loan Details */}
        <View style={styles.newLoanCard}>
          <View style={styles.newLoanHeader}>
            <Text style={styles.newLoanHeaderText}>{t('loans.addLoan').toUpperCase()}</Text>
          </View>

          <View style={styles.inputGrid}>
            {/* Additional Principal */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('rolloverScreen.additionalPrincipal')}</Text>
              <TextInput
                style={styles.input}
                value={additionalAmount}
                onChangeText={setAdditionalAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Interest Rate */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('rolloverScreen.interestPercent')}</Text>
              <TextInput
                style={styles.input}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                placeholder="12"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('rolloverScreen.duration')}</Text>
              <TextInput
                style={styles.input}
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Start Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('rolloverScreen.startDate')}</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setIsDatePickerVisible(true)}
              >
                <Text style={styles.dateBtnText}>{startDate}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Rollover Calculation */}
        <View style={styles.calcCard}>
          <Text style={styles.calcTitle}>{t('rolloverScreen.calculation')}</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{t('rolloverScreen.carriedBalance')}</Text>
            <Text style={styles.calcValue}>{formatCurrency(carriedBalance)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>+ {t('loans.principal')}</Text>
            <Text style={styles.calcValue}>{formatCurrency(parsedAdditional)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>+ {t('loans.interest')} ({parsedRate}%)</Text>
            <Text style={styles.calcValue}>{formatCurrency(interestAmount)}</Text>
          </View>

          <View style={styles.calcDivider} />

          <View style={[styles.calcRow, styles.calcHighlightRow]}>
            <Text style={styles.calcHighlightLabel}>{t('rolloverScreen.combinedPrincipal')}</Text>
            <Text style={styles.calcHighlightValue}>{formatCurrency(combinedPrincipal)}</Text>
          </View>

          <View style={[styles.calcRow, styles.calcDailyRow]}>
            <Text style={styles.calcDailyLabel}>{t('rolloverScreen.newDailyCollection')}</Text>
            <Text style={styles.calcDailyValue}>
              {formatCurrency(newDailyAmount)} / {t('loans.day')}
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.white} />
              <Text style={styles.confirmBtnText}>{t('rolloverScreen.confirmBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker — blocks past dates */}
      <CalendarModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        selectedDate={startDate}
        onSelectDate={setStartDate}
        minDate={today}
      />
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
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Current Loan Summary
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryRowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },

  // New Loan Card
  newLoanCard: {
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    overflow: 'hidden',
  },
  newLoanHeader: {
    backgroundColor: colors.primaryContainer,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  newLoanHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.onPrimaryContainer,
    letterSpacing: 1,
  },
  inputGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
  },
  inputGroup: {
    width: '47%',
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    borderRadius: 2,
  },
  dateBtn: {
    height: 52,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 2,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Calculation Card
  calcCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 16,
    gap: 10,
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calcDivider: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },
  calcHighlightRow: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 2,
  },
  calcHighlightLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  calcHighlightValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  calcDailyRow: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 2,
  },
  calcDailyLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  calcDailyValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.statusPaid,
  },

  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  confirmBtn: {
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
  confirmBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
