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
    const color = focused ? '#0b4619' : '#9ca3af'; // Forest green when active, muted gray when inactive
    const icon = focused ? iconNameFocused : iconNameUnfocused;

    return (
      <View style={styles.tabItem}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff', // White background
          borderTopWidth: 1.5,
          borderTopColor: '#e5e7eb', // Light gray top border
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 12 : 0,
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
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    width: 80,
    textAlign: 'center',
  },
});
