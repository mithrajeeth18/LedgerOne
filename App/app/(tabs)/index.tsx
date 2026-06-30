import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentsApi } from '../../src/api/payments.api';
import colors from '../../src/theme/colors';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { useAuthStore } from '../../src/store/authStore';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TotalStats {
  totalCollected: number;
  totalCash: number;
  totalOnline: number;
}

interface CollectorStats {
  count: number;
  totalCash: number;
  totalOnline: number;
  totalAmount: number;
}

interface GroupStats {
  groupId: string;
  groupName: string;
  collected: number;
  expected: number;
  totalCash: number;
  totalOnline: number;
  totalActiveCustomers: number;
  paidCustomersCount: number;
}

interface TodayPaymentsResponse {
  totals: TotalStats;
  byCollector: Record<string, CollectorStats>;
  byGroup: Record<string, GroupStats>;
  payments: any[];
}

import { useQuery } from '@tanstack/react-query';

// ─── Format Date Pill ───
const getDatePill = () => {
  const today = new Date();
  const day = today.getDate();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${day} ${months[today.getMonth()]}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<TodayPaymentsResponse>({
    queryKey: ['payments', 'today'],
    queryFn: async () => {
      const res = await paymentsApi.getTodayPayments();
      return res.data as TodayPaymentsResponse;
    },
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ─── Render States ───
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0b4619" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0b4619"
              colors={['#0b4619']}
            />
          }
        >
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const totals = data?.totals ?? { totalCollected: 0, totalCash: 0, totalOnline: 0 };
  const collectors = data?.byCollector ?? {};
  const groups = data?.byGroup ?? {};
  const paymentCount = data?.payments ? data.payments.length : 0;

  const collectorEntries = Object.entries(collectors);
  const groupEntries = Object.values(groups);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0b4619"
            colors={['#0b4619']}
          />
        }
      >
        {/* ── Section 1: Total Collection Card ── */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardHeader}>
            <Text style={styles.totalCardLabel}>{t('home.todaysTotalCollection')}</Text>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{getDatePill()}</Text>
            </View>
          </View>

          <Text style={styles.totalAmount}>
            {formatCurrency(totals.totalCollected)}
          </Text>

          <View style={styles.modeSplitRow}>
            {/* Cash Box */}
            <View style={styles.modeBox}>
              <Text style={styles.modeLabel}>{t('payments.cash').toUpperCase()}</Text>
              <Text style={styles.modeValue}>
                {formatCurrency(totals.totalCash)}
              </Text>
            </View>
            {/* Online Box */}
            <View style={styles.modeBox}>
              <Text style={styles.modeLabel}>{t('payments.online').toUpperCase()}</Text>
              <Text style={styles.modeValue}>
                {formatCurrency(totals.totalOnline)}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <Ionicons name="receipt-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardFooterText}>
              {t('home.paymentsRecorded', { count: paymentCount })}
            </Text>
          </View>
        </View>

        {/* ── Section 2: By Collector ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.greenDot} />
          <Text style={styles.sectionTitle}>{t('home.byCollector')}</Text>
        </View>

        <View style={styles.whiteCard}>
          {collectorEntries.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{t('home.noCollectors')}</Text>
            </View>
          ) : (
            collectorEntries.map(([name, stats], idx) => {
              // Avatars C1, C2 etc.
              const avatarLabel = `C${idx + 1}`;
              const hasCollections = stats.count > 0;
              const isMe = currentUser?.name && currentUser.name.toLowerCase() === name.toLowerCase();
              
              return (
                <View key={name}>
                  {idx > 0 && <View style={styles.cardDividerHorizontal} />}
                  <View style={[styles.collectorRow, isMe && styles.myCollectorRow]}>
                    <View style={styles.collectorLeft}>
                      <View style={[styles.avatar, isMe && styles.myAvatar]}>
                        <Text style={styles.avatarText}>{avatarLabel}</Text>
                      </View>
                      <View style={styles.collectorInfo}>
                        <Text style={styles.collectorName}>
                          {name}
                          {isMe && <Text style={styles.youTag}>{t('home.youLabel')}</Text>}
                        </Text>
                        <Text style={styles.collectorSub}>
                          {hasCollections
                            ? t('home.collectionsCount', { count: stats.count })
                            : t('home.noCollectionsYet')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.collectorRight}>
                      <Text style={styles.collectorTotal}>
                        {formatCurrency(stats.totalAmount)}
                      </Text>
                      <Text style={styles.collectorBreakdown}>
                        {t('home.cashLabel')} {formatCurrency(stats.totalCash)}
                      </Text>
                      <Text style={styles.collectorBreakdown}>
                        {t('home.onlineLabel')} {formatCurrency(stats.totalOnline)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Section 3: By Group ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.greenDot} />
          <Text style={styles.sectionTitle}>{t('home.byGroup')}</Text>
        </View>

        <View style={styles.whiteCard}>
          {groupEntries.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{t('home.noGroupsActive')}</Text>
            </View>
          ) : (
            groupEntries.map((group, idx) => {
              const isCompleted =
                group.totalActiveCustomers > 0 &&
                group.paidCustomersCount >= group.totalActiveCustomers;
              
              // Calculate percentage safely based on customer counts rather than amount
              const percent = group.totalActiveCustomers > 0 
                ? Math.min(100, Math.round((group.paidCustomersCount / group.totalActiveCustomers) * 100)) 
                : 0;

              return (
                <View key={group.groupId}>
                  {idx > 0 && <View style={styles.cardDividerHorizontal} />}
                  <TouchableOpacity
                    style={styles.groupRow}
                    onPress={() => router.push({
                      pathname: '/group/[id]',
                      params: { id: group.groupId, fromHome: 'true' }
                    })}
                    activeOpacity={0.85}
                  >
                    {/* Line 1: Group Name & Today Collected Amount */}
                    <View style={styles.groupRowHeader}>
                      <View style={styles.groupNameContainer}>
                        <Text style={[
                          styles.groupName,
                          isCompleted && styles.completedText,
                        ]}>
                          {group.groupName}
                        </Text>
                        {isCompleted && (
                          <Ionicons name="checkmark-circle" size={16} color="#15803d" style={styles.checkIcon} />
                        )}
                      </View>
                      
                      <View style={styles.groupAmountContainer}>
                        <Text style={[
                          styles.groupAmount,
                          isCompleted && styles.completedText,
                        ]}>
                          {formatCurrency(group.collected)}
                        </Text>
                        {!isCompleted && (
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevronIcon} />
                        )}
                      </View>
                    </View>

                    {/* Line 2: X of Y collected & Expected Amount */}
                    <View style={styles.groupRowStats}>
                      <Text style={styles.collectedCountText}>
                        {t('home.collectedRatio', { paid: group.paidCustomersCount, total: group.totalActiveCustomers })}
                      </Text>
                      <Text style={styles.expectedAmountText}>
                        {t('home.expectedLabel')} {formatCurrency(group.expected)}
                      </Text>
                    </View>

                    {/* Line 3: Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View style={[
                        styles.progressBarFill,
                        { width: `${percent}%` },
                        isCompleted && styles.progressBarFillCompleted,
                      ]} />
                    </View>

                    {/* Line 4: Cash/Online split & Optional Percentage Badge */}
                    <View style={styles.groupRowFooter}>
                      <Text style={styles.groupBreakdownText}>
                        {t('home.cashLabel')} {formatCurrency(group.totalCash)} · {t('home.onlineLabel')} {formatCurrency(group.totalOnline)}
                      </Text>
                      {!isCompleted && (
                        <View style={styles.percentBadge}>
                          <Text style={styles.percentBadgeText}>{percent}%</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf3', // sunlight safe background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16, // 16px horizontal padding on all cards
  },

  // Section 1: Total Card
  totalCard: {
    backgroundColor: '#0b4619', // Dark forest green background
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  totalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  datePill: {
    backgroundColor: '#165c27', // slightly lighter green background
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  datePillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: colors.white,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  modeSplitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeBox: {
    flex: 1,
    backgroundColor: '#063a12', // darker green background
    borderWidth: 1,
    borderColor: '#246b33', // lighter green border
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  modeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  cardDivider: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardFooterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Headers outside cards
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12, // 12px vertical gap
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#15803d',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },

  // White Card container
  whiteCard: {
    backgroundColor: colors.surfaceContainerLowest, // white card
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  cardDividerHorizontal: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
  },

  // Collector Section
  collectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16, // inside collector card each row 16px padding
  },
  collectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0b4619', // forest green background
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  collectorInfo: {
    gap: 4,
  },
  collectorName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  collectorSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  collectorRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  collectorTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  collectorBreakdown: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Group Section
  groupRow: {
    paddingVertical: 16,
    paddingHorizontal: 16, // 16px padding top/bottom/left/right inside group card
  },
  groupRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  checkIcon: {
    marginLeft: 2,
  },
  groupAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  chevronIcon: {
    marginLeft: 2,
  },
  completedText: {
    color: '#15803d', // turns forest green when completed
  },
  groupRowStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  collectedCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  expectedAmountText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Progress Bar
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e5e7eb', // light gray background track
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0b4619', // forest green fill
    borderRadius: 3,
  },
  progressBarFillCompleted: {
    backgroundColor: '#15803d', // bright forest green on complete
  },

  groupRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupBreakdownText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  percentBadge: {
    backgroundColor: '#e5e7eb', // light gray background
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  percentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  myCollectorRow: {
    backgroundColor: '#ecfdf5', // Soft green background tint
  },
  myAvatar: {
    borderColor: '#15803d',
    borderWidth: 2,
  },
  youTag: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '900',
  },
});
