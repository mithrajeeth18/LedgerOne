import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '../api/payments.api';
import { formatCurrency } from '../utils/formatCurrency';
import { useDataStore } from '../store/dataStore';
import NumberPad from './NumberPad';
import colors from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMode = 'cash' | 'online';

interface PaymentModalProps {
  /** ref used by parent to open/close via bottomSheetRef.current?.expand() */
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  loanId: string;
  customerName: string;
  dayNumber: number;
  expectedAmount: number;
  /** Called after a successful save so the parent can refresh its data */
  onPaymentSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentModal({
  bottomSheetRef,
  loanId,
  customerName,
  dayNumber,
  expectedAmount,
  onPaymentSaved,
}: PaymentModalProps) {
  const { t } = useTranslation();

  const [rawAmount, setRawAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [saving, setSaving] = useState(false);

  // Snap points: closed + open at 85%
  const snapPoints = useMemo(() => ['85%'], []);

  // ─── Number pad input handler ──────────────────────────────────────────────

  const handleKey = useCallback((key: string) => {
    setRawAmount((prev) => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '00') {
        if (prev === '' || prev === '0') return prev; // ignore leading zeros
        return prev + '00';
      }
      // Prevent leading zero
      if (prev === '0') return key === '0' ? prev : key;
      // Max 7 digits
      if (prev.length >= 7) return prev;
      return prev + key;
    });
  }, []);

  // ─── "Paid Full" button ────────────────────────────────────────────────────

  const handlePaidFull = useCallback(() => {
    setRawAmount(String(expectedAmount));
  }, [expectedAmount]);

  // ─── Save handler ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    const amount = parseInt(rawAmount, 10);
    if (!rawAmount || isNaN(amount) || amount < 0) {
      Alert.alert('', t('payments.enterAmountError'));
      return;
    }

    setSaving(true);
    try {
      const todayISO = new Date().toISOString();
      await paymentsApi.create({
        loanId,
        paidAmount: amount,
        paymentDate: todayISO,
        paymentMode,
      });

      // Close sheet, reset state, notify parent
      bottomSheetRef.current?.close();
      setRawAmount('');
      setPaymentMode('cash');
      useDataStore.getState().invalidateCache();
      onPaymentSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t('payments.saveFailed');
      Alert.alert('', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Backdrop ─────────────────────────────────────────────────────────────

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
      />
    ),
    []
  );

  // ─── Display amount ───────────────────────────────────────────────────────

  const displayAmount = rawAmount ? `₹ ${rawAmount}` : '₹ 0';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content}>
        {/* ── Header row ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerMeta}>{t('payments.customer')}</Text>
            <Text style={styles.headerTitle}>
              {customerName} - Day {dayNumber}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>{t('payments.expected')}</Text>
            <Text style={styles.headerExpected}>{formatCurrency(expectedAmount)}</Text>
          </View>
        </View>

        {/* ── Paid Full button ── */}
        <TouchableOpacity style={styles.paidFullBtn} onPress={handlePaidFull} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={22} color={colors.statusPaid} />
          <Text style={styles.paidFullText}>
            {t('payments.paidFull', { amount: formatCurrency(expectedAmount) })}
          </Text>
        </TouchableOpacity>

        {/* ── OR ENTER AMOUNT label ── */}
        <Text style={styles.orLabel}>{t('payments.orEnterAmount')}</Text>

        {/* ── Amount display ── */}
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>{displayAmount}</Text>
        </View>

        {/* ── Number pad ── */}
        <NumberPad onPress={handleKey} />

        {/* ── Payment mode toggle ── */}
        <Text style={styles.modeLabel}>{t('payments.paymentMode')}</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, paymentMode === 'cash' && styles.modeBtnActive]}
            onPress={() => setPaymentMode('cash')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="wallet-outline"
              size={18}
              color={paymentMode === 'cash' ? colors.white : colors.primary}
            />
            <Text style={[styles.modeBtnText, paymentMode === 'cash' && styles.modeBtnTextActive]}>
              {t('payments.cash')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, paymentMode === 'online' && styles.modeBtnActive]}
            onPress={() => setPaymentMode('online')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={paymentMode === 'online' ? colors.white : colors.primary}
            />
            <Text style={[styles.modeBtnText, paymentMode === 'online' && styles.modeBtnTextActive]}>
              {t('payments.online')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, (!rawAmount || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!rawAmount || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={colors.white} />
              <Text style={styles.saveBtnText}>{t('payments.savePayment')}</Text>
            </>
          )}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: colors.outlineVariant,
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  headerMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerExpected: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 2,
  },

  // Paid Full
  paidFullBtn: {
    height: 52,
    backgroundColor: '#d1fae5', // light green — same shade as status paid background
    borderWidth: 1.5,
    borderColor: colors.statusPaid,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  paidFullText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.statusPaid,
  },

  // OR label
  orLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },

  // Amount display
  amountBox: {
    height: 56,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // Payment mode
  modeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 4,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  modeBtnTextActive: {
    color: colors.white,
  },

  // Save
  saveBtn: {
    height: 60,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
