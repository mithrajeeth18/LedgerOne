import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { customersApi } from '../../src/api/customers.api';
import { paymentsApi } from '../../src/api/payments.api';
import PaymentModal from '../../src/components/PaymentModal';
import { useDataStore } from '../../src/store/dataStore';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';

interface ActiveLoan {
  _id: string;
  loanNumber: number;
  principalAmount: number;
  interestRate: number;
  totalDays: number;
  dailyAmount: number;
  startDate: string;
  status: string;
}

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [collecting, setCollecting] = useState(false);

  // States for instant collection mode selection modal
  const [isCollectModalVisible, setIsCollectModalVisible] = useState(false);
  const [collectPaymentMode, setCollectPaymentMode] = useState<'cash' | 'online'>('cash');

  // Bottom sheet ref — used to open the payment modal
  const paymentSheetRef = useRef<BottomSheet>(null);

  // Loan Management sheet visibility
  const [isLoanMgmtVisible, setIsLoanMgmtVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer_details', id],
    queryFn: async () => {
      const res = await customersApi.getById(id);
      let paymentsList: any[] = [];
      if (res.data.activeLoan) {
        const { data: rawPayments } = await paymentsApi.getForLoan(res.data.activeLoan._id);
        paymentsList = rawPayments;
      }
      return {
        customer: res.data.customer,
        activeLoan: res.data.activeLoan,
        payments: paymentsList,
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const customer = data?.customer;
  const activeLoan = data?.activeLoan;
  const payments = data?.payments ?? [];

  const handleCollect = () => {
    if (!activeLoan) return;
    setCollectPaymentMode('cash');
    setIsCollectModalVisible(true);
  };

  const confirmCollection = async () => {
    if (!activeLoan) return;

    setCollecting(true);
    try {
      const todayStr = new Date().toISOString();
      await paymentsApi.create({
        loanId: activeLoan._id,
        paidAmount: activeLoan.dailyAmount,
        paymentDate: todayStr,
        paymentMode: collectPaymentMode,
      });

      setIsCollectModalVisible(false);
      useDataStore.getState().invalidateCache();
      Alert.alert(t('common.confirm'), t('payments.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['customer_details', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t('payments.saveFailed');
      Alert.alert(t('payments.saveFailed'), msg);
    } finally {
      setCollecting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <Text style={styles.errorText}>Customer not found.</Text>
      </SafeAreaView>
    );
  }

  // Calculate day info (e.g. Day 13 of 50)
  let dayNumber = 1;
  let hasPaymentToday = false;
  let todayStatusLabel = 'PENDING';
  let todayStatusColor = colors.statusPending;
  let pendingAmount = 0;
  let totalPaid = 0; // sum of all payments on this loan — passed to close/rollover screens

  // Detect if the loan hasn't started yet (future start date)
  let loanNotStarted = false;
  let daysUntilStart = 0;
  let startDateDisplay = '';

  if (activeLoan) {
    const start = new Date(activeLoan.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = start.getTime() - today.getTime();
    daysUntilStart = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    loanNotStarted = daysUntilStart > 0;

    // Format startDate as DD-MM-YYYY for display
    const dd = String(start.getDate()).padStart(2, '0');
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const yyyy = start.getFullYear();
    startDateDisplay = `${dd}-${mm}-${yyyy}`;

    // totalPaid across ALL payments for this loan (used for close/rollover)
    totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);

    if (!loanNotStarted) {
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      dayNumber = Math.min(activeLoan.totalDays, Math.max(1, diffDays + 1));

      // Check if any payment was made today
      const localTodayStr = new Date().toLocaleDateString('en-CA');
      const todayPayment = payments.find((p) => {
        const pDate = new Date(p.paymentDate);
        return pDate.toLocaleDateString('en-CA') === localTodayStr;
      });
      hasPaymentToday = todayPayment !== undefined;

      if (todayPayment) {
        todayStatusLabel = todayPayment.status.toUpperCase();
        if (todayPayment.status === 'paid' || todayPayment.status === 'overpaid') {
          todayStatusColor = colors.statusPaid;
        } else if (todayPayment.status === 'underpaid') {
          todayStatusColor = colors.statusUnderpaid;
        } else {
          todayStatusColor = colors.statusPending;
        }
      }

      // Calculate pending amount
      const expectedUpToToday = activeLoan.dailyAmount * dayNumber;
      pendingAmount = Math.max(0, expectedUpToToday - totalPaid);
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* TopAppBar: Back, Customer Name uppercase, Notifications */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{customer.name.toUpperCase()}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Alerts', 'Notifications click')}>
            <Ionicons name="notifications" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Customer Info Card */}
          <View style={styles.profileSection}>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{customer.name}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={16} color={colors.textSecondary} />
                <Text style={styles.profilePhone}>+91 {customer.phone}</Text>
              </View>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>
                  {typeof customer.groupId === 'string' ? 'SUKAPUR' : customer.groupId?.name?.toUpperCase() ?? 'SUKAPUR'}
                </Text>
              </View>
            </View>

            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{customer.name[0].toUpperCase()}</Text>
            </View>
          </View>

          {/* Loan Box */}
          {activeLoan ? (
            loanNotStarted ? (
              // ── Not Started Card (Follows design template) ─────────────────
              <View style={styles.loanCard}>
                <View style={styles.notStartedHeaderRow}>
                  <View style={styles.notStartedHeaderLeft}>
                    <View style={styles.notStartedBadge}>
                      <Text style={styles.notStartedBadgeText}>{t('loans.notStarted')}</Text>
                    </View>
                    <Text style={styles.notStartedTitle}>
                      {t('loans.startingIn', { count: daysUntilStart })}
                    </Text>
                    <Text style={styles.notStartedSubtitle}>
                      {t('loans.startsOn', { date: startDateDisplay })}
                    </Text>
                  </View>
                  <Text style={styles.loanNumberLabel}>
                    {t('loans.loanNumber', { number: activeLoan.loanNumber })}
                  </Text>
                </View>

                <View style={styles.notStartedDivider} />

                <View style={styles.notStartedTermsRow}>
                  <Text style={styles.termsAmountText}>
                    {formatCurrency(activeLoan.dailyAmount)} / {t('loans.day')}
                  </Text>
                  <Text style={styles.termsSeparatorText}> • </Text>
                  <Text style={styles.termsDurationText}>
                    {activeLoan.totalDays} {t('loans.day', { count: activeLoan.totalDays })}
                  </Text>
                </View>
              </View>
            ) : (
            <View style={styles.loanCard}>
              {/* Row 1: status badge (left) | LOAN# (right) */}
              <View style={styles.loanCardHeader}>
                <View style={[styles.statusBadge, { borderColor: todayStatusColor }]}>
                  <Text style={[styles.statusBadgeText, { color: todayStatusColor }]}>
                    {t(`loans.status.${todayStatusLabel.toLowerCase()}`, { defaultValue: todayStatusLabel })}
                  </Text>
                </View>
                <Text style={styles.loanNumberLabel}>
                  {t('loans.loanNumber', { number: activeLoan.loanNumber })}
                </Text>
              </View>

              {/* Row 2: Day counter (left) | 3-dot menu (right) */}
              <View style={styles.dayCounterRow}>
                <Text style={styles.dayCounter}>
                  {t('loans.dayCounter', { day: dayNumber, total: activeLoan.totalDays })}
                </Text>
                <TouchableOpacity
                  style={styles.threeDotBtn}
                  onPress={() => setIsLoanMgmtVisible(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{t('loans.todayCollection')}</Text>
                  <Text style={[styles.tableValue, { color: colors.statusPaid }]}>
                    {formatCurrency(activeLoan.dailyAmount)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{t('loans.pending')}</Text>
                  <Text style={[styles.tableValue, { color: colors.statusPending }]}>
                    {formatCurrency(pendingAmount)}
                  </Text>
                </View>
              </View>
            </View>
            )
          ) : (
            <View style={styles.noLoanCard}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noLoanTitle}>{t('loans.noActiveLoan')}</Text>
              <Text style={styles.noLoanText}>{t('loans.noActiveLoanDesc')}</Text>
              <TouchableOpacity 
                style={styles.createLoanBtn} 
                onPress={() => router.push({
                  pathname: '/loan/create',
                  params: {
                    customerId: customer._id,
                    customerName: customer.name,
                    groupId: typeof customer.groupId === 'string' ? customer.groupId : customer.groupId?._id
                  }
                })}
              >
                <Text style={styles.createLoanBtnText}>{t('loans.createLoan')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Actions — hidden entirely when loan hasn't started */}
          {activeLoan && !loanNotStarted && (
            <View style={styles.actionsContainer}>
              {/* Primary: Collect full amount instantly */}
              <TouchableOpacity
                style={[styles.collectBtn, (hasPaymentToday || collecting) && styles.collectBtnDisabled]}
                onPress={handleCollect}
                disabled={hasPaymentToday || collecting}
              >
                {collecting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons name="add-circle" size={24} color={colors.white} />
                    <Text style={styles.collectBtnText}>
                      {hasPaymentToday 
                        ? t('loans.paidToday') 
                        : `${t('loans.collect')} ${formatCurrency(activeLoan.dailyAmount)}`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Secondary: Enter custom amount via modal */}
              <TouchableOpacity
                style={[styles.enterAmountBtn, hasPaymentToday && styles.enterAmountBtnDisabled]}
                onPress={() => paymentSheetRef.current?.expand()}
                disabled={hasPaymentToday}
              >
                <Ionicons name="keypad-outline" size={20} color={hasPaymentToday ? colors.textMuted : colors.primary} />
                <Text style={[styles.enterAmountBtnText, hasPaymentToday && { color: colors.textMuted }]}>
                  {t('payments.enterAmount')}
                </Text>
              </TouchableOpacity>

              {/* Tertiary: View full history */}
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => router.push({
                  pathname: '/loan/history',
                  params: {
                    loanId: activeLoan!._id,
                    customerName: customer.name,
                  },
                })}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.historyBtnText}>{t('loans.history')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Payment bottom sheet — rendered outside ScrollView so it overlays correctly */}
        {activeLoan && !loanNotStarted && (
          <PaymentModal
            bottomSheetRef={paymentSheetRef}
            loanId={activeLoan._id}
            customerId={id}
            customerName={customer.name}
            dayNumber={dayNumber}
            expectedAmount={activeLoan.dailyAmount}
            onPaymentSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['customer_details', id] });
              queryClient.invalidateQueries({ queryKey: ['payments', 'today'] });
            }}
          />
        )}

        {/* ── Loan Management Bottom Sheet ── */}
        <Modal
          visible={isLoanMgmtVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsLoanMgmtVisible(false)}
        >
          <TouchableOpacity
            style={styles.loanMgmtOverlay}
            activeOpacity={1}
            onPress={() => setIsLoanMgmtVisible(false)}
          >
            <View style={styles.loanMgmtSheet}>
              {/* Sheet Header */}
              <View style={styles.loanMgmtHeader}>
                <Text style={styles.loanMgmtTitle}>{t('loans.loanManagement')}</Text>
                <TouchableOpacity onPress={() => setIsLoanMgmtVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Option 1: Close Loan */}
              <TouchableOpacity
                style={styles.loanMgmtOption}
                onPress={() => {
                  setIsLoanMgmtVisible(false);
                  router.push({
                    pathname: '/loan/close',
                    params: {
                      loanId: activeLoan!._id,
                      customerName: customer.name,
                      principalAmount: String(activeLoan!.principalAmount ?? activeLoan!.dailyAmount * activeLoan!.totalDays),
                      totalPaid: String(totalPaid),
                    },
                  });
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
                <Text style={[styles.loanMgmtOptionText, { color: '#dc2626' }]}>{t('loans.closeLoan')}</Text>
              </TouchableOpacity>

              {/* Option 2: Close & Rollover */}
              <TouchableOpacity
                style={styles.loanMgmtOption}
                onPress={() => {
                  setIsLoanMgmtVisible(false);
                  router.push({
                    pathname: '/loan/rollover',
                    params: {
                      loanId: activeLoan!._id,
                      customerName: customer.name,
                      groupId: typeof customer.groupId === 'string' ? customer.groupId : customer.groupId?._id,
                      principalAmount: String(activeLoan!.principalAmount ?? activeLoan!.dailyAmount * activeLoan!.totalDays),
                      totalPaid: String(totalPaid),
                    },
                  });
                }}
              >
                <Ionicons name="sync-outline" size={22} color="#b45309" />
                <Text style={[styles.loanMgmtOptionText, { color: '#b45309' }]}>{t('loans.closeAndRollover')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Instant Collection Payment Mode Modal Overlay ── */}
        <Modal
          visible={isCollectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCollectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('payments.selectPaymentMode')}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsCollectModalVisible(false)}
                  style={styles.modalCloseBtn}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Mode Options */}
              <View style={styles.modalModesRow}>
                <TouchableOpacity
                  style={[
                    styles.modalModeOption,
                    collectPaymentMode === 'cash' && styles.modalModeOptionActive,
                  ]}
                  onPress={() => setCollectPaymentMode('cash')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={28}
                    color={collectPaymentMode === 'cash' ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.modalModeLabel,
                      collectPaymentMode === 'cash' && styles.modalModeLabelActive,
                    ]}
                  >
                    {t('payments.cash').toUpperCase()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalModeOption,
                    collectPaymentMode === 'online' && styles.modalModeOptionActive,
                  ]}
                  onPress={() => setCollectPaymentMode('online')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="card-outline"
                    size={28}
                    color={collectPaymentMode === 'online' ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.modalModeLabel,
                      collectPaymentMode === 'online' && styles.modalModeLabelActive,
                    ]}
                  >
                    {t('payments.online').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.modalSaveBtn, collecting && styles.modalSaveBtnDisabled]}
                onPress={confirmCollection}
                disabled={collecting}
                activeOpacity={0.85}
              >
                {collecting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                    <Text style={styles.modalSaveBtnText}>
                      {t('payments.savePayment').toUpperCase()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.statusPending,
    fontWeight: '700',
  },
  header: {
    height: 56,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileTextContainer: {
    gap: 8,
    flex: 1,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profilePhone: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.textSecondary,
    fontWeight: '700',
  },
  groupBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  avatarBox: {
    width: 64,
    height: 64,
    backgroundColor: '#b4f2b3', // light green container
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  loanCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    padding: 16,
    gap: 12,
    borderRadius: 4,
  },
  notStartedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notStartedHeaderLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  notStartedBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
  },
  notStartedBadgeText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notStartedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  notStartedSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notStartedDivider: {
    height: 2,
    backgroundColor: colors.borderHeavy,
    marginVertical: 4,
  },
  notStartedTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  termsAmountText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryLight || '#0b4619',
  },
  termsSeparatorText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  termsDurationText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface || '#191c18',
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loanNumberLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayCounter: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'left',
    flex: 1,
  },
  dayCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  threeDotBtn: {
    padding: 6,
    marginLeft: 4,
  },
  detailsTable: {
    borderTopWidth: 1.5,
    borderColor: colors.surfaceContainer,
    paddingTop: 12,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tableValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 14,
    marginTop: 8,
  },
  collectBtn: {
    height: 64,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Enter Amount — secondary outlined button
  enterAmountBtn: {
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  enterAmountBtnDisabled: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  enterAmountBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyBtn: {
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  historyBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  noLoanCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  noLoanTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  noLoanText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  createLoanBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  createLoanBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderWidth: 2.5,
    borderColor: colors.borderHeavy,
    padding: 20,
    gap: 20,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalModesRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalModeOption: {
    flex: 1,
    height: 84,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
  },
  modalModeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.borderHeavy,
  },
  modalModeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  modalModeLabelActive: {
    color: colors.white,
  },
  modalSaveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
  },
  modalSaveBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  modalSaveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ── Loan Management Bottom Sheet ──────────────────────────────────────────
  loanMgmtOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  loanMgmtSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 2,
    borderTopColor: colors.borderHeavy,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  loanMgmtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loanMgmtTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  loanMgmtOption: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 4,
  },
  loanMgmtOptionText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});
