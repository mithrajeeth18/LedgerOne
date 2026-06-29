import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // Format: DD-MM-YYYY
  onSelectDate: (date: string) => void;
  minDate?: Date; // Optional: dates before this are disabled
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  minDate,
}: CalendarModalProps) {
  // Parse initial selectedDate (DD-MM-YYYY)
  const parsedSelected = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const dd = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10) - 1;
        const yyyy = parseInt(parts[2], 10);
        return new Date(yyyy, mm, dd);
      }
    } catch (e) {
      console.warn('Failed to parse selectedDate', e);
    }
    return new Date();
  }, [selectedDate]);

  // Keep state of the month currently being viewed
  const [viewDate, setViewDate] = useState(() => new Date(parsedSelected.getFullYear(), parsedSelected.getMonth(), 1));

  // Sync viewDate when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setViewDate(new Date(parsedSelected.getFullYear(), parsedSelected.getMonth(), 1));
    }
  }, [visible, parsedSelected]);

  // Generate calendar grid
  const gridCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of month (0 = Sunday, 1 = Monday...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells: (number | null)[] = [];
    
    // Prefix empty padding days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    
    // Actual calendar days
    for (let day = 1; day <= totalDays; day++) {
      cells.push(day);
    }
    
    // Suffix empty padding days to align grid cleanly
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    
    return cells;
  }, [viewDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    // Don't allow selection of disabled past dates
    if (minDate) {
      const candidate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      candidate.setHours(0, 0, 0, 0);
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (candidate < min) return;
    }
    const dd = String(day).padStart(2, '0');
    const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
    const yyyy = viewDate.getFullYear();
    onSelectDate(`${dd}-${mm}-${yyyy}`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Row */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={styles.monthLabel}>
              {MONTHS[viewDate.getMonth()].toUpperCase()} {viewDate.getFullYear()}
            </Text>
            
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {gridCells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayBox} />;
              }

              const isSelected = 
                parsedSelected.getDate() === day &&
                parsedSelected.getMonth() === viewDate.getMonth() &&
                parsedSelected.getFullYear() === viewDate.getFullYear();

              let isDisabled = false;
              if (minDate && day !== null) {
                const candidate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                candidate.setHours(0, 0, 0, 0);
                const min = new Date(minDate);
                min.setHours(0, 0, 0, 0);
                isDisabled = candidate < min;
              }

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[styles.dayBox, isSelected && styles.dayBoxSelected, isDisabled && styles.dayBoxDisabled]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={isDisabled ? 1 : 0.8}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isDisabled && styles.dayTextDisabled]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel/Close Footer */}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.background,
    borderWidth: 2.5,
    borderColor: colors.borderHeavy,
    borderRadius: 4,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 8,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  dayBox: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  dayBoxSelected: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.borderHeavy,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.white,
  },
  dayBoxDisabled: {
    opacity: 0.3,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerLowest,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
