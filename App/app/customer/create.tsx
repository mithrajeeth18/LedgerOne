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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { customersApi } from '../../src/api/customers.api';
import colors from '../../src/theme/colors';
import { useQueryClient } from '@tanstack/react-query';
import { useDataStore } from '../../src/store/dataStore';

interface GroupItem {
  _id: string;
  name: string;
}

export default function CreateCustomerScreen() {
  const queryClient = useQueryClient();
  const { groupId: paramGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(paramGroupId ?? '');
  
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load groups from cache/store to populate selector
  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      try {
        const data = await useDataStore.getState().fetchGroups();
        setGroups(data);
        // If not passed as parameter, default to the first group
        if (!selectedGroupId && data.length > 0) {
          setSelectedGroupId(data[0]._id);
        }
      } catch (err) {
        console.error('[CreateCustomer] Failed to fetch groups:', err);
        Alert.alert('Error', 'Failed to load groups list.');
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, []);

  const handleCreate = async () => {
    if (creating) return;

    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter the customer\'s name.');
      return;
    }

    const phoneClean = phone.trim();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneClean)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number (e.g. 9876543210).');
      return;
    }

    if (!selectedGroupId) {
      Alert.alert('Validation Error', 'Please select a collection group.');
      return;
    }

    setCreating(true);
    try {
      const { data } = await customersApi.create({
        name: name.trim(),
        phone: phoneClean,
        groupId: selectedGroupId,
      });

      // Clear cached customer & group data in store to force a refresh on navigation back
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      useDataStore.getState().invalidateCache();
      
      // Save info in global store to show the popup toast on the returning screen
      useDataStore.getState().setLastCreatedCustomer({
        id: data._id,
        name: data.name,
      });

      // Navigate back immediately without blocking the collector with an alert popup
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create customer.';
      Alert.alert('Registration Failed', msg);
      setCreating(false); // only reset on failure so they can correct inputs and try again
    }
  };

  // Find preselected group name if paramGroupId was passed
  const selectedGroup = groups.find((g) => g._id === selectedGroupId);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW CUSTOMER</Text>
        <View style={styles.headerBtnPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {/* Form fields */}
        <View style={styles.form}>
          
          {/* Group Field (Locked if passed from query, picker otherwise) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>COLLECTION GROUP</Text>
            {paramGroupId ? (
              <View style={[styles.inputBox, styles.inputBoxLocked]}>
                <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                <Text style={styles.lockedText}>
                  {selectedGroup ? selectedGroup.name.toUpperCase() : 'LOADING...'}
                </Text>
              </View>
            ) : loadingGroups ? (
              <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <View style={styles.pickerContainer}>
                {groups.map((group) => {
                  const isActive = selectedGroupId === group._id;
                  return (
                    <TouchableOpacity
                      key={group._id}
                      style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                      onPress={() => setSelectedGroupId(group._id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pickerItemText, isActive && styles.pickerItemTextActive]}>
                        {group.name.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Name Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.inputBox}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ram Kumar"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              accessibilityLabel="Full name"
            />
          </View>

          {/* Phone Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.inputBox}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              accessibilityLabel="Phone number"
            />
          </View>

        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, creating && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color={colors.white} />
              <Text style={styles.submitBtnText}>REGISTER CUSTOMER</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerBtnPlaceholder: {
    width: 44,
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
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  inputBox: {
    height: 52,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 4,
  },
  inputBoxLocked: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  lockedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pickerItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.borderHeavy,
  },
  pickerItemText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  pickerItemTextActive: {
    color: colors.white,
  },
  submitBtn: {
    height: 60,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderRadius: 4,
  },
  submitBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
