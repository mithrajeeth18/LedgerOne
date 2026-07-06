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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loansApi } from '../../src/api/loans.api';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { useQueryClient } from '@tanstack/react-query';
import { useDataStore } from '../../src/store/dataStore';
import CalendarModal from '../../src/components/CalendarModal';

export default function EditLoanScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const {
    loanId,
    customerName,
    groupId,
    dailyAmount: origDailyAmount,
    principalAmount: origPrincipalAmount,
    interestRate: origInterestRate,
    totalDays: origTotalDays,
    startDate: origStartDate,
    totalPaid: totalPaidStr,
  } = useLocalSearchParams<{
    loanId: string;
    customerName: string;
    groupId: string;
    dailyAmount: string;
    principalAmount: string;
    interestRate: string;
    totalDays: string;
    startDate: string;
    totalPaid: string;
  }>();

  // Determine original mode: if principalAmount is set and > 0 → principal, else → daily
  const originalMode: 'daily' | 'principal' =
    origPrincipalAmount && parseFloat(origPrincipalAmount) > 0 ? 'principal' : 'daily';

  const [mode, setMode] = useState<'daily' | 'principal'>(originalMode);
  const [dailyAmount, setDailyAmount] = useState(origDailyAmount ?? '300');
  const [principalAmount, setPrincipalAmount] = useState(
    origPrincipalAmount && parseFloat(origPrincipalAmount) > 0 ? origPrincipalAmount : '10000'
  );
  const [interestRate, setInterestRate] = useState(origInterestRate ?? '12');
  const [durationDays, setDurationDays] = useState(origTotalDays ?? '50');
  const [startDate, setStartDate] = useState(origStartDate ?? '');
  const [saving, setSaving] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Numeric parses
  const parsedDailyAmount = parseFloat(dailyAmount) || 0;
  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedInterestRate = parseFloat(interestRate) || 0;
  const parsedDuration = parseInt(durationDays, 10) || 0;
  const totalPaid = parseFloat(totalPaidStr ?? '0') || 0;

  // Computed totals based on current inputs
  let totalToCollect = 0;
  let computedDailyInstallment = 0;
  let interestAmount = 0;

  if (mode === 'daily') {
    totalToCollect = parsedDailyAmount * parsedDuration;
    computedDailyInstallment = parsedDailyAmount;
  } else {
    interestAmount = Math.round((parsedPrincipal * parsedInterestRate) / 100);
    totalToCollect = parsedPrincipal + interestAmount;
    computedDailyInstallment = parsedDuration > 0 ? Math.ceil(totalToCollect / parsedDuration) : 0;
  }

  const remainingAfterEdit = Math.max(0, totalToCollect - totalPaid);

  // Detect if anything changed from original values so we can enable/disable button
  const hasChanged = useMemo(() => {
    const origDaily = parseFloat(origDailyAmount ?? '0') || 0;
    const origPrinc = parseFloat(origPrincipalAmount ?? '0') || 0;
    const origDays = parseInt(origTotalDays ?? '0', 10) || 0;
    const origDate = origStartDate ?? '';

    if (mode !== originalMode) return true;
    if (mode === 'daily' && parsedDailyAmount !== origDaily) return true;
    if (mode === 'principal' && (parsedPrincipal !== origPrinc || parsedInterestRate !== (parseFloat(origInterestRate ?? '12') || 12))) return true;
    if (parsedDuration !== origDays) return true;
    if (startDate !== origDate) return true;
    return false;
  }, [mode, dailyAmount, principalAmount, interestRate, durationDays, startDate]);

  const handleEdit = async () => {
    if (!loanId) {
      Alert.alert('Error', 'Missing loan ID.');
      return;
    }

    if (mode === 'daily' && parsedDailyAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid daily amount.');
      return;
    }
    if (mode === 'principal' && parsedPrincipal <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid principal amount.');
      return;
    }
    if (parsedDuration <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration.');
      return;
    }

    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(startDate.trim())) {
      Alert.alert('Validation Error', 'Please enter start date in DD-MM-YYYY format.');
      return;
    }

    const [dd, mm, yyyy] = startDate.trim().split('-');
    const apiStartDate = `${yyyy}-${mm}-${dd}`;

    Alert.alert(
      'Confirm Edit',
      `This will update the loan terms and recalculate all existing payments.\n\nPreviously "paid" days may show as UNDERPAID if the new daily amount is higher.\n\nProceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Loan',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await loansApi.edit(loanId, {
                mode,
                dailyAmount: mode === 'daily' ? parsedDailyAmount : undefined,
                principalAmount: mode === 'principal' ? parsedPrincipal : undefined,
                interestRate: mode === 'principal' ? parsedInterestRate : undefined,
                totalDays: parsedDuration,
                startDate: apiStartDate,
              });

              // Invalidate all affected caches
              queryClient.invalidateQueries({ queryKey: ['customer_details'] });
              queryClient.invalidateQueries({ queryKey: ['customers'] });
              queryClient.invalidateQueries({ queryKey: ['groups'] });
              queryClient.invalidateQueries({ queryKey: ['loan_history', loanId] });
              useDataStore.getState().invalidateCache();

              Alert.alert('Success', 'Loan updated successfully! Existing payments have been recalculated.');
              router.back();
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? 'Failed to update loan.';
              Alert.alert('Error', msg);
            } finally {
              setSaving(false);
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
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>EDIT LOAN</Text>
          <Text style={styles.headerSubtitle}>
            CUSTOMER: {customerName?.toUpperCase() ?? 'UNKNOWN'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 280 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Already Paid Banner */}
        {totalPaid > 0 && (
          <View style={styles.paidBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#b45309" />
            <Text style={styles.paidBannerText}>
              <Text style={styles.paidBannerBold}>{formatCurrency(totalPaid)}</Text> already collected — existing payments will be recalculated against the new daily amount.
            </Text>
          </View>
        )}

        {/* Segmented Mode Selector */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'daily' && styles.segmentBtnActive]}
            onPress={() => setMode('daily')}
          >
            <Text style={[styles.segmentText, mode === 'daily' && styles.segmentTextActive]}>
              DAILY AMOUNT
            </Text>
          </TouchableOpacity>
          <View style={styles.segmentDivider} />
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'principal' && styles.segmentBtnActive]}
            onPress={() => setMode('principal')}
          >
            <Text style={[styles.segmentText, mode === 'principal' && styles.segmentTextActive]}>
              PRINCIPAL + INT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {mode === 'daily' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DAILY AMOUNT</Text>
              <View style={styles.currencyInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.currencyInput}
                  keyboardType="numeric"
                  value={dailyAmount}
                  onChangeText={setDailyAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>PRINCIPAL (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={principalAmount}
                  onChangeText={setPrincipalAmount}
                  placeholder="10000"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>INTEREST (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="12"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* Duration & Start Date */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>DURATION (DAYS)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={durationDays}
                onChangeText={setDurationDays}
                placeholder="50"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>START DATE</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDatePickerVisible(true)}
                style={styles.dateInputContainer}
              >
                <TextInput
                  style={[styles.input, { paddingRight: 36 }]}
                  value={startDate}
                  editable={false}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={colors.textMuted}
                />
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.textPrimary}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <CalendarModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        selectedDate={startDate}
        onSelectDate={setStartDate}
      />

      {/* Bottom Summary + Action */}
      <View style={[styles.bottomFixedContainer, { paddingBottom: (Platform.OS === 'ios' ? 24 : 16) + insets.bottom }]}>
        {/* Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>NEW TOTAL</Text>
              <Text style={styles.previewTotal}>{formatCurrency(totalToCollect)}</Text>
            </View>
            <View style={styles.previewColDivider} />
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>ALREADY PAID</Text>
              <Text style={[styles.previewTotal, { color: colors.statusPaid, fontSize: 20 }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
            <View style={styles.previewColDivider} />
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>REMAINING</Text>
              <Text style={[styles.previewTotal, { color: colors.statusUnderpaid ?? '#dc2626', fontSize: 20 }]}>
                {formatCurrency(remainingAfterEdit)}
              </Text>
            </View>
          </View>
          {mode === 'principal' && (
            <Text style={styles.previewDetailsText}>
              Principal: {formatCurrency(parsedPrincipal)} • Interest ({parsedInterestRate}%): {formatCurrency(interestAmount)}
            </Text>
          )}
          <Text style={styles.previewInstallmentText}>
            Daily Installment:{' '}
            <Text style={styles.previewInstallmentValue}>{formatCurrency(computedDailyInstallment)}</Text>
          </Text>
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={[styles.editBtn, (!hasChanged || saving) && styles.editBtnDisabled]}
          onPress={handleEdit}
          disabled={!hasChanged || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <View style={styles.editBtnContent}>
              <Ionicons name="create-outline" size={22} color={colors.white} />
              <Text style={styles.editBtnText}>
                {hasChanged ? 'EDIT LOAN' : 'NO CHANGES'}
              </Text>
            </View>
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
    height: 64,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderColor: colors.borderHeavy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
  },
  paidBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  paidBannerBold: {
    fontWeight: '800',
    color: '#78350f',
  },
  segmentedControl: {
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentDivider: {
    width: 2,
    backgroundColor: colors.borderHeavy,
    height: '100%',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: colors.white,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  currencyInputContainer: {
    height: 64,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dateInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  calendarIcon: {
    position: 'absolute',
    right: 14,
    pointerEvents: 'none',
  },
  bottomFixedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderColor: colors.borderHeavy,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    zIndex: 10,
  },
  previewCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    padding: 12,
    gap: 6,
    alignItems: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    width: '100%',
  },
  previewCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  previewColDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.outlineVariant,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  previewTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  previewDetailsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewInstallmentText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewInstallmentValue: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  editBtn: {
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  editBtnDisabled: {
    opacity: 0.45,
  },
  editBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
