import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

interface NumberPadProps {
  onPress: (key: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '00'];

export default function NumberPad({ onPress }: NumberPadProps) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.key}
          onPress={() => onPress(key)}
          activeOpacity={0.7}
          accessibilityLabel={key === '⌫' ? 'Backspace' : key}
        >
          {key === '⌫' ? (
            <Ionicons name="backspace-outline" size={22} color={colors.textPrimary} />
          ) : (
            <Text style={styles.keyText}>{key}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    // Each key takes exactly 1/3 of the row width minus gaps
    width: '30%',
    flexGrow: 1,
    height: 52,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
