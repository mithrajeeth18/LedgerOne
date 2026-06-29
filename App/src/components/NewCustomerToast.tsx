import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useDataStore } from '../store/dataStore';
import colors from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NewCustomerToast() {
  const lastCustomer = useDataStore((s) => s.lastCreatedCustomer);
  const clearLastCustomer = useDataStore((s) => s.setLastCreatedCustomer);

  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (lastCustomer) {
      setVisible(true);
      // Animate entry: Fade in and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastCustomer]);

  const handleDismiss = () => {
    // Animate exit
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      clearLastCustomer(null);
    });
  };

  const handleView = () => {
    if (lastCustomer) {
      const { id } = lastCustomer;
      handleDismiss();
      router.push(`/customer/${id}`);
    }
  };

  if (!visible || !lastCustomer) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.toastCard}>
        {/* Left: Icon circle */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={14} color="#2b2e26" />
        </View>

        {/* Middle: Text (2 lines) */}
        <View style={styles.textContainer}>
          <Text style={styles.line1}>New customer</Text>
          <Text style={styles.line2}>created</Text>
        </View>

        {/* Right: Button (2 lines) */}
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={handleView}
          activeOpacity={0.8}
        >
          <Text style={styles.viewText}>VIEW</Text>
          <Text style={styles.viewText}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 24,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastCard: {
    backgroundColor: '#2b2e26', // Dark olive-gray theme
    borderWidth: 2,
    borderColor: colors.borderHeavy,
    borderRadius: 2, // Sharp corners matching the mockup
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#77b077', // Soft green color matching mockup
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  line1: {
    color: '#eaeaea',
    fontSize: 15,
    fontWeight: '500',
  },
  line2: {
    color: '#eaeaea',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 1,
  },
  viewBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  viewText: {
    color: '#98c599', // Bright olive/emerald green matching mockup
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});
