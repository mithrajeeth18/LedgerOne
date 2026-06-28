import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import colors from '../../src/theme/colors';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const renderTabIcon = (
    iconNameFocused: keyof typeof Ionicons.glyphMap,
    iconNameUnfocused: keyof typeof Ionicons.glyphMap,
    label: string,
    focused: boolean
  ) => {
    if (focused) {
      return (
        <View style={styles.activeCapsule}>
          <Ionicons name={iconNameFocused} size={22} color={colors.onPrimaryContainer} />
          <Text style={styles.activeLabel}>{label}</Text>
        </View>
      );
    }

    return (
      <View style={styles.inactiveContainer}>
        <Ionicons name={iconNameUnfocused} size={22} color={colors.tabInactive} />
        <Text style={styles.inactiveLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 2,
          borderTopColor: colors.borderHeavy,
          height: 72,
          paddingBottom: Platform.OS === 'ios' ? 16 : 0,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon('home', 'home-outline', 'Home', focused),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon('people', 'people-outline', 'Groups', focused),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon('person', 'person-outline', 'Customers', focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon('settings', 'settings-outline', 'Settings', focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeCapsule: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 52,
    gap: 2,
  },
  activeLabel: {
    color: colors.onPrimaryContainer,
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 52,
    gap: 2,
  },
  inactiveLabel: {
    color: colors.tabInactive,
    fontSize: 11,
    fontWeight: '700',
  },
});
