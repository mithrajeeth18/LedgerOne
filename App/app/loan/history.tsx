import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../../src/api/loans.api';
import { paymentsApi } from '../../src/api/payments.api';
import PaymentModal from '../../src/components/PaymentModal';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { useDataStore } from '../../src/store/dataStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  _id: string;
  paymentDate: string;
  paidAmount: number;
  expectedAmount: number;
  status: 'paid' | 'underpaid' | 'overpaid' | 'skipped';
  paymentMode: 'cash' | 'online';
  cumulativePending: number;
  isLocked: boolean;
}

interface Loan {
  _id: string;
  loanNumber: number;
  principalAmount: number;
  dailyAmount: number;
  totalDays: number;
  startDate: string;
  status: string;
  interestRate: number;
}

type DayState = 'paid' | 'underpaid' | 'skipped' | 'overpaid' | 'today' | 'pending_past' | 'future';

interface DayCell {
  dayNumber: number;           // 1-based
  date: Date;
  state: DayState;
  payment: Payment | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_DAYS_SHOWN = 9;

const DAY_STATE_COLOR: Record<DayState, string> = {
  paid:         colors.statusPaid,
  overpaid:     colors.statusPaid,
  underpaid:    colors.statusUnderpaid,
  skipped:      colors.statusPending,
  pending_past: colors.statusPending,
  today:        colors.textPrimary,
  future:       colors.surfaceContainerHigh,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) => {
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const formatDateLong = (d: Date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoanHistoryScreen() {
  const { loanId, customerName } = useLocalSearchParams<{
    loanId: string;
    customerName: string;
  }>();

  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const nestedScrollRef = useRef<ScrollView>(null);
  const [showAll, setShowAll]   = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  const paymentSheetRef = useRef<BottomSheet>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['loan_history', loanId],
    queryFn: async () => {
      const res = await loansApi.getById(loanId);
      return res.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const loan = data?.loan;
  const payments = data?.payments ?? [];
  const customerId = typeof loan?.customerId === 'string'
    ? loan.customerId
    : loan?.customerId?._id;

  const fetchData = async () => {
    await refetch();
  };

  // ─── Build day grid ────────────────────────────────────────────────────────

  const dayGrid: DayCell[] = React.useMemo(() => {
    if (!loan) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(loan.startDate);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: loan.totalDays }, (_, i) => {
      const dayNumber = i + 1;
      const date      = new Date(start);
      date.setDate(start.getDate() + i);

      const payment = payments.find((p: any) => {
        const pd = new Date(p.paymentDate);
        pd.setHours(0, 0, 0, 0);
        return isSameDay(pd, date);
      }) ?? null;

      let state: DayState;
      if (payment) {
        state = payment.status as DayState;
      } else if (isSameDay(date, today)) {
        state = 'today';
      } else if (date < today) {
        state = 'pending_past';
      } else {
        state = 'future';
      }

      return { dayNumber, date, state, payment };
    });
  }, [loan, payments]);

  // ─── Derived stats ─────────────────────────────────────────────────────────

  const stats = React.useMemo(() => {
    if (!loan) return { expectedSoFar: 0, collected: 0, pending: 0, currentDay: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(loan.startDate);
    start.setHours(0, 0, 0, 0);
    const diffDays  = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(loan.totalDays, Math.max(1, diffDays + 1));
    const expectedSoFar = loan.dailyAmount * currentDay;
    const collected     = payments.reduce((s: number, p: any) => s + p.paidAmount, 0);
    const pending       = Math.max(0, expectedSoFar - collected);
    return { expectedSoFar, collected, pending, currentDay };
  }, [loan, payments]);

  const todayCell = dayGrid.find((d) => d.state === 'today');

  // Set default selected day to current day on mount
  useEffect(() => {
    if (dayGrid.length > 0 && stats.currentDay > 0 && !selectedDay) {
      const currentCell = dayGrid.find(cell => cell.dayNumber === stats.currentDay);
      if (currentCell) {
        setSelectedDay(currentCell);
      }
    }
  }, [dayGrid, stats.currentDay]);

  // Center/auto-scroll nested scroll viewport on today in collapsed mode
  useEffect(() => {
    if (!showAll && loan && stats.currentDay > 0) {
      const currentDay = stats.currentDay;
      const totalDays = loan.totalDays;
      if (totalDays > 9) {
        const windowStart = Math.min(totalDays - 8, Math.max(1, currentDay - 4));
        const targetRowIdx = Math.floor((windowStart - 1) / 3);
        const scrollOffset = targetRowIdx * 86; // 80px cell height + 6px gap

        setTimeout(() => {
          nestedScrollRef.current?.scrollTo({ y: scrollOffset, animated: false });
        }, 150);
      }
    }
  }, [showAll, loan, stats.currentDay]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectDay = (cell: DayCell | null) => {
    setSelectedDay(cell);
    if (cell) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCollect = () => {
    if (!todayCell) return;
    paymentSheetRef.current?.expand();
  };

  const handleMarkMissed = async (cell: DayCell) => {
    if (!loan) return;
    Alert.alert(
      'Mark as Missed',
      `Mark Day ${cell.dayNumber} (${formatDateLong(cell.date)}) as missed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Missed',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentsApi.create({
                loanId: loan._id,
                paidAmount: 0,
                paymentDate: cell.date.toISOString(),
                paymentMode: 'cash',
              });
              useDataStore.getState().invalidateCache();
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error ?? 'Failed to mark as missed.');
            }
          },
        },
      ]
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Loan not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderDayCell = (cell: DayCell) => {
    const isSelected = selectedDay?.dayNumber === cell.dayNumber;
    const { state, dayNumber, payment } = cell;

    const isPaid    = state === 'paid' || state === 'overpaid';
    const isMissed  = state === 'skipped' || state === 'pending_past';
    const isToday   = state === 'today';
    const isUnderpaid = state === 'underpaid';
    const isFuture  = state === 'future';

    return (
      <TouchableOpacity
        key={dayNumber}
        style={[
          styles.dayCell,
          isPaid      && styles.dayCellPaid,
          isUnderpaid && styles.dayCellUnderpaid,
          isMissed    && styles.dayCellMissed,
          isToday     && styles.dayCellToday,
          isFuture    && styles.dayCellFuture,
          isSelected  && styles.dayCellSelected,
        ]}
        onPress={() => handleSelectDay(isSelected ? null : cell)}
        activeOpacity={0.8}
      >
        {/* Day number badge */}
        <Text style={[
          styles.dayCellNum,
          (isPaid || isUnderpaid) && styles.dayCellNumLight,
        ]}>
          {dayNumber}
        </Text>

        {isPaid && (
          <Ionicons name="checkmark" size={22} color={colors.white} />
        )}
        {isUnderpaid && (
          <Ionicons name="checkmark" size={22} color={colors.white} />
        )}
        {isMissed && (
          <Ionicons name="close" size={22} color={colors.statusPending} />
        )}
        {isToday && (
          <>
            <Text style={styles.todayBadge}>TODAY</Text>
            <Text style={styles.todayAmount}>{formatCurrency(loan.dailyAmount)}</Text>
          </>
        )}
        {isFuture && (
          <Text style={styles.futureDash}>—</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Build rows of 3
  const gridRows: DayCell[][] = [];
  for (let i = 0; i < dayGrid.length; i += 3) {
    gridRows.push(dayGrid.slice(i, i + 3));
  }

  const canMarkMissed = selectedDay &&
    (selectedDay.state === 'pending_past') &&
    !selectedDay.payment;

  const canCollectToday = selectedDay?.state === 'today';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LOAN HISTORY</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Info Strip ── */}
          <View style={styles.infoStrip}>
            {/* Left: day counter + start date */}
            <View>
              <Text style={styles.dayCounter}>Day {stats.currentDay} of {loan.totalDays}</Text>
              <Text style={styles.startDate}>Start: {formatDate(new Date(loan.startDate))}</Text>
            </View>

            {/* Right: daily + total split in two columns */}
            <View style={styles.infoRight}>
              <View style={styles.infoRightCol}>
                <Text style={styles.infoLabel}>DAILY</Text>
                <Text style={styles.infoValue}>{formatCurrency(loan.dailyAmount)}</Text>
              </View>
              <View style={styles.infoRightDivider} />
              <View style={styles.infoRightCol}>
                <Text style={styles.infoLabel}>TOTAL LOAN</Text>
                <Text style={styles.infoValue}>{formatCurrency(loan.principalAmount ?? loan.dailyAmount * loan.totalDays)}</Text>
              </View>
            </View>
          </View>

          {/* ── Calendar Grid ── */}
          {showAll ? (
            <View style={styles.gridWrapper}>
              {gridRows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {row.map((cell) => renderDayCell(cell))}
                  {/* Pad incomplete rows */}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={styles.dayCellPad} />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              ref={nestedScrollRef}
              style={styles.nestedScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.gridWrapper}>
                {gridRows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.gridRow}>
                    {row.map((cell) => renderDayCell(cell))}
                    {/* Pad incomplete rows */}
                    {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View key={`pad-${i}`} style={styles.dayCellPad} />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* ── Expand / Collapse toggle ── */}
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setShowAll((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandBtnText}>
              {showAll ? 'SHOW LESS' : 'VIEW ALL DAYS'}
            </Text>
            <Ionicons
              name={showAll ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* ── Day Details Card ── */}
          {selectedDay && (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>DAY {selectedDay.dayNumber} DETAILS</Text>
                {/* Status badge */}
                {(() => {
                  const s = selectedDay.state;
                  const label =
                    s === 'paid'         ? 'PAID'
                  : s === 'overpaid'     ? 'OVERPAID'
                  : s === 'underpaid'    ? 'UNDERPAID'
                  : s === 'skipped'      ? 'MISSED'
                  : s === 'pending_past' ? 'PENDING'
                  : s === 'today'        ? 'TODAY'
                  : 'FUTURE';

                  const badgeColor =
                    s === 'paid' || s === 'overpaid' ? colors.statusPaid
                  : s === 'underpaid'                ? colors.statusUnderpaid
                  : s === 'skipped' || s === 'pending_past' ? colors.statusPending
                  : colors.textSecondary;

                  return (
                    <View style={[styles.detailBadge, { borderColor: badgeColor }]}>
                      <Text style={[styles.detailBadgeText, { color: badgeColor }]}>{label}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Row: Date + Status label */}
              <View style={styles.detailRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>DATE</Text>
                  <Text style={styles.detailValueLarge}>{formatDateLong(selectedDay.date)}</Text>
                </View>
                {selectedDay.payment && (
                  <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.detailLabel}>PAYMENT MODE</Text>
                    <Text style={styles.detailValue}>
                      {selectedDay.payment.paymentMode.charAt(0).toUpperCase() + selectedDay.payment.paymentMode.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.detailDivider} />

              {/* Row: Amount */}
              <View style={styles.detailRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>AMOUNT</Text>
                  <Text style={styles.detailValueLarge}>
                    {formatCurrency(selectedDay.payment?.paidAmount ?? 0)}
                    <Text style={styles.detailValueSub}> of {formatCurrency(loan.dailyAmount)}</Text>
                  </Text>
                </View>
                {!selectedDay.payment && (
                  <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.detailLabel}>PAYMENT MODE</Text>
                    <Text style={[styles.detailValue, { color: colors.textMuted }]}>Not marked</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.detailActions}>
                {canMarkMissed && (
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => handleMarkMissed(selectedDay)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailActionBtnText}>MARK MISSED</Text>
                  </TouchableOpacity>
                )}
                {canCollectToday && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnPrimary]}
                    onPress={handleCollect}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wallet-outline" size={16} color={colors.white} />
                    <Text style={[styles.detailActionBtnText, { color: colors.white }]}>COLLECT NOW</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

        </ScrollView>

        {/* ── Summary Bar ── */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>EXPECTED{'\n'}SO FAR</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats.expectedSoFar)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.statusPaid }]}>COLLECTED</Text>
            <Text style={[styles.summaryValue, { color: colors.statusPaid }]}>{formatCurrency(stats.collected)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryLabel, { color: colors.statusPending }]}>PENDING</Text>
            <Text style={[styles.summaryValue, { color: colors.statusPending }]}>{formatCurrency(stats.pending)}</Text>
          </View>
        </View>

        {/* ── Collect CTA ── */}
        {todayCell && (
          <TouchableOpacity
            style={[
              styles.collectBtn,
              todayCell.payment && styles.collectBtnDone,
            ]}
            onPress={handleCollect}
            disabled={!!todayCell.payment}
            activeOpacity={0.85}
          >
            <Ionicons
              name={todayCell.payment ? 'checkmark-circle' : 'wallet-outline'}
              size={22}
              color={colors.white}
            />
            <Text style={styles.collectBtnText}>
              {todayCell.payment
                ? 'PAID TODAY'
                : `COLLECT ${formatCurrency(loan.dailyAmount)}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Payment Bottom Sheet ── */}
        {todayCell && !todayCell.payment && (
          <PaymentModal
            bottomSheetRef={paymentSheetRef}
            loanId={loan._id}
            customerId={customerId}
            customerName={customerName ?? ''}
            dayNumber={stats.currentDay}
            expectedAmount={loan.dailyAmount}
            onPaymentSaved={() => {
              useDataStore.getState().invalidateCache();
              fetchData();
            }}
          />
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  // Header
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1,
  },

  scroll: {
    padding: 16,
    gap: 16,
  },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderHeavy,
  },
  dayCounter: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  startDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRightCol: {
    alignItems: 'flex-end',
  },
  infoRightDivider: {
    width: 1.5,
    height: 30,
    backgroundColor: colors.outlineVariant,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginTop: 2,
  },

  // Grid
  gridWrapper: {
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
    gap: 2,
    position: 'relative',
  },
  dayCellPad: {
    flex: 1,
    height: 80,
  },
  dayCellNum: {
    position: 'absolute',
    top: 5,
    left: 7,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayCellNumLight: {
    color: 'rgba(255,255,255,0.7)',
  },
  dayCellPaid: {
    backgroundColor: colors.statusPaid,
    borderColor: colors.statusPaid,
  },
  dayCellUnderpaid: {
    backgroundColor: colors.statusUnderpaid,
    borderColor: colors.statusUnderpaid,
  },
  dayCellMissed: {
    borderColor: colors.statusPending,
    borderWidth: 2,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dayCellToday: {
    borderColor: colors.borderHeavy,
    borderWidth: 2.5,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dayCellFuture: {
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: 'transparent',
  },
  dayCellSelected: {
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  todayBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  todayAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  futureDash: {
    fontSize: 18,
    color: colors.outlineVariant,
    fontWeight: '300',
  },

  // Expand button
  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Day Detail Card
  detailCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  detailBadge: {
    borderWidth: 1.5,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  detailBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    gap: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  detailValueLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailValueSub: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailDivider: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  detailActionBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerLowest,
  },
  detailActionBtnPrimary: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.borderHeavy,
  },
  detailActionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1.5,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  nestedScroll: {
    height: 252,
  },

  // Collect CTA
  collectBtn: {
    height: 64,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 2,
    borderTopColor: colors.borderHeavy,
  },
  collectBtnDone: {
    backgroundColor: colors.surfaceContainer,
  },
  collectBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
