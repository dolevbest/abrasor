import { Tabs } from "expo-router";
import { Calculator, User, Shield, Bell, Menu } from "lucide-react-native";
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { useAuth } from "@/hooks/auth-context";
import { useNotifications } from "@/hooks/notifications-context";
import { useTheme } from "@/hooks/theme-context";
import { useMenu } from "@/hooks/menu-context";
import UnitToggle from "@/components/UnitToggle";
import SideMenu from "@/components/SideMenu";
import { router } from "expo-router";

export default function TabLayout() {
  const { isAuthenticated, user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme } = useTheme();
  const { isMenuOpen, openMenu, closeMenu } = useMenu();

  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isGuest]);

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return (
    <>
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
            <View style={styles.headerTitleContainer}>
              <TouchableOpacity 
                style={styles.headerNotificationButton} 
                onPress={() => router.push('/notifications')}
              >
                <Bell size={24} color={theme.headerText} />
                {unreadCount > 0 && (
                  <View style={[styles.headerNotificationBadge, { backgroundColor: theme.error }]}>
                    <Text style={[styles.headerNotificationBadgeText, { color: theme.primaryText }]}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ),
          tabBarIcon: ({ color }) => <Calculator size={24} color={color} />,
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={openMenu}>
                <Menu size={24} color={theme.headerText} />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.notificationButton} 
                onPress={() => router.push('/notifications')}
              >
                <Bell size={20} color={theme.headerText} />
                {unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.error }]}>
                    <Text style={[styles.notificationBadgeText, { color: theme.primaryText }]}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
      <SideMenu visible={isMenuOpen} onClose={closeMenu} />
    </>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 12,
  },
  headerTitle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  headerNotificationButton: {
    position: 'relative',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerNotificationBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 12,
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