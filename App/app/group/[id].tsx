import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { groupsApi, DashboardCustomer } from '../../src/api/groups.api';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentStatus = 'PAID' | 'UNDERPAID' | 'PENDING' | 'NOT_STARTED' | 'NO_LOAN';
type LoanFilter    = 'all' | 'active' | 'no_loan';
type PaymentFilter = 'all' | 'pending' | 'paid' | 'underpaid';

interface CustomerCard {
  _id: string;
  name: string;
  phone: string;
  status: PaymentStatus;
  loanNumber?: number;
  paidAmount?: number;
  pendingAmount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveStatus(customer: DashboardCustomer): PaymentStatus {
  if (!customer.activeLoan) return 'NO_LOAN';

  // Loan exists but hasn't started yet
  const startDate = new Date(customer.activeLoan.startDate);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate > today) return 'NOT_STARTED';

  const payment = customer.todayPayment;
  if (!payment) return 'PENDING';

  if (payment.status === 'paid' || payment.status === 'overpaid') return 'PAID';
  if (payment.status === 'underpaid') return 'UNDERPAID';
  return 'PENDING'; // skipped
}

const STATUS_ORDER: Record<PaymentStatus, number> = {
  PENDING:     0,
  UNDERPAID:   1,
  NOT_STARTED: 2,
  NO_LOAN:     3,
  PAID:        4,
};

function sortCustomers(cards: CustomerCard[]): CustomerCard[] {
  return [...cards].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

// ─── Status Chip config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { color: string; label: string }> = {
  PAID:        { color: colors.statusPaid,        label: 'PAID'        },
  UNDERPAID:   { color: colors.statusUnderpaid,   label: 'UNDERPAID'   },
  PENDING:     { color: colors.statusPending,     label: 'PENDING'     },
  NOT_STARTED: { color: '#2563eb',               label: 'NOT STARTED' },
  NO_LOAN:     { color: colors.statusInactive,   label: 'NO LOAN'     },
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const { id, groupName: paramName, fromHome } = useLocalSearchParams<{
    id: string;
    groupName?: string;
    fromHome?: string;
  }>();

  const [groupName, setGroupName]   = useState(paramName ?? '…');
  const [allCards, setAllCards]     = useState<CustomerCard[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [loanFilter,    setLoanFilter]    = useState<LoanFilter>('active');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  // Draft (in-sheet) copies so changes apply only on "APPLY FILTERS"
  const [draftLoan,    setDraftLoan]    = useState<LoanFilter>('active');
  const [draftPayment, setDraftPayment] = useState<PaymentFilter>('all');

  const filtersActive = loanFilter !== 'active' || paymentFilter !== 'all';

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setError(null);
    try {
      const { data } = await groupsApi.getDashboard(id);

      setGroupName(data.group.name);

      const cards: CustomerCard[] = data.customers.map((c) => {
        const status = resolveStatus(c);
        let paidAmount = 0;
        let pendingAmount = 0;

        if (c.activeLoan) {
          pendingAmount = c.activeLoan.dailyAmount;
          if (c.todayPayment) {
            paidAmount = c.todayPayment.paidAmount;
            pendingAmount = Math.max(0, c.activeLoan.dailyAmount - c.todayPayment.paidAmount);
          }
        }

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          status,
          loanNumber: c.activeLoan?.loanNumber || undefined,
          paidAmount,
          pendingAmount,
        };
      });

      setAllCards(sortCustomers(cards));
    } catch (err) {
      console.error('[GroupDashboard] fetch error:', err);
      setError('Could not load customers. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // ─── Filter sheet handlers ────────────────────────────────────────────────

  const openFilterSheet = () => {
    // Seed drafts with committed values
    setDraftLoan(loanFilter);
    setDraftPayment(paymentFilter);
    setFilterSheetVisible(true);
  };

  const applyFilters = () => {
    setLoanFilter(draftLoan);
    setPaymentFilter(draftPayment);
    setFilterSheetVisible(false);
  };

  const clearFilters = () => {
    setDraftLoan('active');
    setDraftPayment('all');
  };

  // ─── Counts for filter labels ─────────────────────────────────────────────

  // Active = has a loan AND it has started (i.e. collecting is meaningful today)
  const activeCards    = allCards.filter(c => c.status !== 'NO_LOAN' && c.status !== 'NOT_STARTED');
  const noLoanCards    = allCards.filter(c => c.status === 'NO_LOAN');
  const paidCount      = allCards.filter(c => c.status === 'PAID').length;
  const pendingCount   = allCards.filter(c => c.status === 'PENDING').length;
  const underpaidCount = allCards.filter(c => c.status === 'UNDERPAID').length;

  // ─── Apply committed filters + search ────────────────────────────────────

  const filtered = allCards.filter(card => {
    // Loan status filter — 'active' hides both NO_LOAN and NOT_STARTED
    if (loanFilter === 'active'  && (card.status === 'NO_LOAN' || card.status === 'NOT_STARTED')) return false;
    if (loanFilter === 'no_loan' && card.status !== 'NO_LOAN') return false;

    // Payment focus (only meaningful when active loan)
    if (loanFilter !== 'no_loan') {
      if (paymentFilter === 'paid'      && card.status !== 'PAID')      return false;
      if (paymentFilter === 'pending'   && card.status !== 'PENDING')   return false;
      if (paymentFilter === 'underpaid' && card.status !== 'UNDERPAID') return false;
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = card.name.toLowerCase().includes(q);
      const loanMatch = card.loanNumber !== undefined && String(card.loanNumber).includes(search.trim());
      return nameMatch || loanMatch;
    }

    return true;
  });

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderCard = ({ item }: { item: CustomerCard }) => {
    const { color, label } = STATUS_CONFIG[item.status];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/customer/${item._id}`)}
        activeOpacity={0.85}
        accessibilityLabel={`Customer ${item.name}, status ${label}`}
      >
        {/* Left: name + phone */}
        <View style={styles.cardLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName}>{item.name}</Text>
            {item.loanNumber !== undefined && (
              <Text style={styles.loanNumberText}>L-{item.loanNumber}</Text>
            )}
          </View>
          <Text style={styles.customerPhone}>{item.phone}</Text>
        </View>

        {/* Right side: status display depending on navigation context */}
        <View style={[styles.cardRight, fromHome !== 'true' && { alignItems: 'center', minWidth: 64 }]}>
          {fromHome === 'true' ? (
            (() => {
              const status = item.status;
              if (status === 'PAID') {
                return (
                  <Text style={[styles.statusLabelBold, { color: colors.statusPaid }]}>
                    PAID {formatCurrency(item.paidAmount ?? 0)}
                  </Text>
                );
              }
              if (status === 'UNDERPAID') {
                return (
                  <Text style={[styles.statusLabelBold, { color: colors.statusUnderpaid }]}>
                    PAID {formatCurrency(item.paidAmount ?? 0)}
                  </Text>
                );
              }
              if (status === 'PENDING') {
                return (
                  <Text style={[styles.statusLabelBold, { color: colors.statusPending }]}>
                    PENDING {formatCurrency(item.pendingAmount ?? 0)}
                  </Text>
                );
              }
              if (status === 'NOT_STARTED') {
                return (
                  <Text style={[styles.statusLabelBold, { color: '#2563eb' }]}>
                    NOT STARTED
                  </Text>
                );
              }
              return (
                <Text style={[styles.statusLabelBold, { color: colors.statusInactive }]}>
                  NO LOAN
                </Text>
              );
            })()
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.statusLabel, { color }]}>{label}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {search.trim() ? (
        <Text style={styles.emptyText}>No customers found for this search.</Text>
      ) : (
        <>
          <Text style={styles.emptyText}>No customers in this group yet.</Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => router.push(`/customer/create?groupId=${id}`)}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.emptyAddBtnText}>Add Customer</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>

        {/* Filter button with red dot badge if filters active */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={openFilterSheet}
          accessibilityLabel="Filter customers"
        >
          <Ionicons name="filter" size={20} color={colors.white} />
          {filtersActive && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search customers"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/customer/create?groupId=${id}`)}
        activeOpacity={0.85}
        accessibilityLabel="Add Customer"
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>

      {/* ── Filter Sheet ── */}
      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setFilterSheetVisible(false)}
        />
        <View style={styles.sheetContainer}>
          {/* Drag handle */}
          <View style={styles.sheetHandle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>FILTER CUSTOMERS</Text>
            <TouchableOpacity
              onPress={() => setFilterSheetVisible(false)}
              style={styles.sheetCloseBtn}
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── LOAN STATUS ── */}
          <Text style={styles.sectionLabel}>LOAN STATUS</Text>
          <View style={styles.segmentRow}>
            {(['all', 'active', 'no_loan'] as LoanFilter[]).map((val) => {
              const labels: Record<LoanFilter, string> = {
                all: 'ALL',
                active: 'ACTIVE LOAN',
                no_loan: 'NO LOAN',
              };
              const active = draftLoan === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => {
                    setDraftLoan(val);
                    // Reset payment filter when switching away from 'active'
                    if (val !== 'active') setDraftPayment('all');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {labels[val]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── PAYMENT FOCUS (only when active loan selected) ── */}
          {draftLoan === 'active' && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>PAYMENT FOCUS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentFilterRow}
              >
                {[
                  { val: 'all'       as PaymentFilter, label: `ALL ACTIVE (${activeCards.length})`, color: colors.textPrimary },
                  { val: 'pending'   as PaymentFilter, label: `PENDING (${pendingCount})`,           color: colors.statusPending },
                  { val: 'underpaid' as PaymentFilter, label: `UNDERPAID (${underpaidCount})`,       color: colors.statusUnderpaid },
                  { val: 'paid'      as PaymentFilter, label: `PAID (${paidCount})`,                 color: colors.statusPaid },
                ].map(({ val, label, color }) => {
                  const active = draftPayment === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.paymentChip,
                        active && { borderColor: color, backgroundColor: color + '18' },
                      ]}
                      onPress={() => setDraftPayment(val)}
                      activeOpacity={0.8}
                    >
                      {val !== 'all' && (
                        <View style={[styles.chipDot, { backgroundColor: color }]} />
                      )}
                      <Text style={[styles.chipText, active && { color, fontWeight: '800' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* ── APPLY button ── */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={clearFilters}
              activeOpacity={0.8}
            >
              <Text style={styles.clearBtnText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={applyFilters}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>APPLY FILTERS</Text>
              <Ionicons name="filter" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderHeavy,
    backgroundColor: colors.background,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusPending,
    borderWidth: 1,
    borderColor: colors.white,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    height: 52,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // Cards
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 10,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  cardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  statusLabelBold: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  loanNumberText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.borderHeavy,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 8,
    backgroundColor: colors.surfaceContainer,
  },

  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyAddBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    backgroundColor: '#1b4332',
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // ── Filter Sheet ──────────────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 44,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.borderHeavy,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  segmentTextActive: {
    color: colors.white,
  },
  paymentFilterRow: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 4,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 4,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  clearBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  applyBtn: {
    flex: 1,
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
  applyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
