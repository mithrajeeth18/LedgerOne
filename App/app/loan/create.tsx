import React, { useState, useEffect } from 'react';
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
import { loansApi } from '../../src/api/loans.api';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { useQueryClient } from '@tanstack/react-query';
import { useDataStore } from '../../src/store/dataStore';
import CalendarModal from '../../src/components/CalendarModal';

export default function CreateLoanScreen() {
  const queryClient = useQueryClient();
  const { customerId, customerName, groupId } = useLocalSearchParams<{
    customerId: string;
    customerName: string;
    groupId: string;
  }>();

  const [mode, setMode] = useState<'daily' | 'principal'>('daily');
  const [dailyAmount, setDailyAmount] = useState('300');
  const [principalAmount, setPrincipalAmount] = useState('10000');
  const [interestRate, setInterestRate] = useState('12');
  const [durationDays, setDurationDays] = useState('50');
  
  // Set default date to today (DD-MM-YYYY format)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });

  const [creating, setCreating] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Parse numeric values safely
  const parsedDailyAmount = parseFloat(dailyAmount) || 0;
  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedInterestRate = parseFloat(interestRate) || 0;
  const parsedDuration = parseInt(durationDays, 10) || 0;

  // Compute total and daily installments
  let totalToCollect = 0;
  let computedDailyInstallment = 0;
  let interestAmount = 0;

  if (mode === 'daily') {
    totalToCollect = parsedDailyAmount * parsedDuration;
    computedDailyInstallment = parsedDailyAmount;
  } else {
    // Principal mode: flat interest calculation
    interestAmount = Math.round((parsedPrincipal * parsedInterestRate) / 100);
    totalToCollect = parsedPrincipal + interestAmount;
    computedDailyInstallment = parsedDuration > 0 ? Math.ceil(totalToCollect / parsedDuration) : 0;
  }

  const handleCreate = async () => {
    if (!customerId || !groupId) {
      Alert.alert('Error', 'Missing customer or group parameters.');
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

    // Validate DD-MM-YYYY date format
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(startDate.trim())) {
      Alert.alert('Validation Error', 'Please enter start date in DD-MM-YYYY format (e.g. 27-06-2026).');
      return;
    }

    // Convert DD-MM-YYYY to YYYY-MM-DD for backend
    const [dd, mm, yyyy] = startDate.trim().split('-');
    const apiStartDate = `${yyyy}-${mm}-${dd}`;

    setCreating(true);
    try {
      await loansApi.create({
        customerId,
        groupId,
        mode,
        dailyAmount: mode === 'daily' ? parsedDailyAmount : undefined,
        principalAmount: mode === 'principal' ? parsedPrincipal : undefined,
        interestRate: mode === 'principal' ? parsedInterestRate : undefined,
        totalDays: parsedDuration,
        startDate: apiStartDate,
      });

      // Invalidate cached groups and customers to trigger updates on next fetch
      queryClient.invalidateQueries({ queryKey: ['customer_details', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      useDataStore.getState().invalidateCache();

      Alert.alert('Success', 'Loan created successfully!');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create loan.';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar: Go back, NEW LOAN title, Customer subtitle */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>NEW LOAN</Text>
          <Text style={styles.headerSubtitle}>
            CUSTOMER: {customerName?.toUpperCase() ?? 'UNKNOWN'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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

        {/* Input Form Fields */}
        <View style={styles.form}>
          {mode === 'daily' ? (
            /* Mode 1: Daily Amount input */
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
            /* Mode 2: Principal + Interest input grid */
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>PRINCIPAL(₹)</Text>
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

          {/* Shared Row: Duration & Start Date */}
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

      {/* Calendar Picker Modal */}
      <CalendarModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        selectedDate={startDate}
        onSelectDate={setStartDate}
      />

      {/* Bottom Summary Preview & Actions */}
      <View style={styles.bottomFixedContainer}>
        {/* Calculation Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>TOTAL TO COLLECT</Text>
          <Text style={styles.previewTotal}>{formatCurrency(totalToCollect)}</Text>
          
          {mode === 'principal' && (
            <Text style={styles.previewDetailsText}>
              Principal: {formatCurrency(parsedPrincipal)} • Interest ({parsedInterestRate}%): {formatCurrency(interestAmount)}
            </Text>
          )}
          
          <Text style={styles.previewInstallmentText}>
            Daily Installment: <Text style={styles.previewInstallmentValue}>{formatCurrency(computedDailyInstallment)}</Text>
          </Text>
        </View>

        {/* Primary Action Trigger */}
        <TouchableOpacity
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <View style={styles.createBtnContent}>
              <Ionicons name="document-text-outline" size={22} color={colors.white} />
              <Text style={styles.createBtnText}>CREATE LOAN</Text>
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
    paddingTop: 24,
    paddingBottom: 240, // generous space for the bottom summary overlay
    gap: 24,
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    gap: 12,
    zIndex: 10,
  },
  previewCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  previewTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  previewDetailsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewInstallmentText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  previewInstallmentValue: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  createBtn: {
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0, // flat shadow
    elevation: 4,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
