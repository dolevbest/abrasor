import { Tabs } from "expo-router";
import { Calculator, User, Shield, Bell, Menu } from "lucide-react-native";
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

import { useAuth } from "@/hooks/auth-context";
import { useNotifications } from "@/hooks/notifications-context";
import { useTheme } from "@/hooks/theme-context";
import UnitToggle from "@/components/UnitToggle";
import AbrasorLogo from "@/components/AbrasorLogo";
import { router } from "expo-router";

export default function TabLayout() {
  const { isAuthenticated, user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isGuest]);

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.headerBackground,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTitleStyle: {
          fontWeight: '600' as const,
          color: theme.headerText,
        },
      }}
    >
      <Tabs.Screen
        name="calculators"
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <AbrasorLogo size={28} />
            </View>
          ),
          tabBarIcon: ({ color }) => <Calculator size={24} color={color} />,
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <Menu size={24} color={theme.headerText} />
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <UnitToggle />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <View>
              <Bell size={24} color={color} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.error }]}>
                  <Text style={[styles.badgeText, { color: theme.primaryText }]}>{unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color }) => <Shield size={24} color={color} />,
          href: user?.role === 'admin' && !isGuest ? undefined : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    marginLeft: 16,
  },
  headerRight: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});