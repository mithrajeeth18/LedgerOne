import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { groupsApi } from '../../src/api/groups.api';
import { customersApi } from '../../src/api/customers.api';
import { paymentsApi } from '../../src/api/payments.api';
import colors from '../../src/theme/colors';

interface GroupData {
  _id: string;
  name: string;
  customerCount: number;
  activeLoanCount: number;
  paidCount: number;
}

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export default function GroupsScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await groupsApi.getAll();
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: Infinity,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const res = await customersApi.getAll({ limit: 1000 });
      return res.data.customers ?? res.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: Infinity,
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'today_raw'],
    queryFn: async () => {
      const res = await paymentsApi.getTodayPayments();
      return res.data.payments ?? res.data;
    },
    staleTime: 30000,
  });

  const isLoading = groupsQuery.isLoading || customersQuery.isLoading || paymentsQuery.isLoading;
  const isError = groupsQuery.isError || customersQuery.isError || paymentsQuery.isError;

  const groups: GroupData[] = useMemo(() => {
    if (!groupsQuery.data || !customersQuery.data || !paymentsQuery.data) return [];
    return groupsQuery.data.map((g: any) => {
      const groupCustomers = customersQuery.data.filter((c: any) => {
        const cid = typeof c.groupId === 'string' ? c.groupId : c.groupId?._id;
        return cid === g._id;
      });

      const activeLoanCustomers = groupCustomers.filter(
        (c: any) => c.activeLoan !== null && c.activeLoan !== undefined
      );

      const groupPayments = paymentsQuery.data.filter((p: any) => {
        const pgid = typeof p.loanId?.groupId === 'string' 
          ? p.loanId.groupId 
          : p.loanId?.groupId?._id;
        return pgid === g._id;
      });

      return {
        _id: g._id,
        name: g.name,
        customerCount: groupCustomers.length,
        activeLoanCount: activeLoanCustomers.length,
        paidCount: groupPayments.length,
      };
    });
  }, [groupsQuery.data, customersQuery.data, paymentsQuery.data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      groupsQuery.refetch(),
      customersQuery.refetch(),
      paymentsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const renderGroupItem = ({ item }: { item: GroupData }) => {
    const isCompleted = item.paidCount === item.activeLoanCount && item.activeLoanCount > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/group/${item._id}`)}
        activeOpacity={0.8}
        accessibilityLabel={`Group ${item.name}`}
      >
        <Text style={styles.groupLetter}>{item.name}</Text>

        <View style={styles.detailsRow}>
          {/* Column 1: CUSTOMERS */}
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>CUSTOMERS</Text>
            <View style={styles.countContainer}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.countText}>{item.customerCount}</Text>
            </View>
          </View>

          {/* Column 2: PROGRESS */}
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>PROGRESS</Text>
            <View style={styles.countContainer}>
              {isCompleted ? (
                <Ionicons name="checkmark-done" size={20} color={colors.statusPaid} style={styles.doneIcon} />
              ) : null}
              <Text 
                style={[
                  styles.progressText, 
                  isCompleted && { color: colors.statusPaid }
                ]}
              >
                {item.paidCount} / {item.activeLoanCount}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar: Collection Groups */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Menu', 'Menu clicked')}>
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Groups</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Search', 'Search clicked')}>
          <Ionicons name="search" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No collection groups found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  loader: {
    marginTop: 60,
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 20,
    gap: 12,
  },
  groupLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailCol: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doneIcon: {
    marginRight: -2,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 60,
    fontSize: 15,
    fontWeight: '500',
  },
});
