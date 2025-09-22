import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from "@/hooks/auth-context";
import { SettingsProvider } from "@/hooks/settings-context";
import { CalculationsProvider } from "@/hooks/calculations-context";
import { CalculatorsProvider } from "@/hooks/calculators-context";
import { ThemeProvider, useTheme } from "@/hooks/theme-context";
import { NotificationsProvider } from "@/hooks/notifications-context";
import { MenuProvider } from "@/hooks/menu-context";
import NotificationOverlay from "@/components/NotificationOverlay";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

// Utility to detect and clear corrupted AsyncStorage data on app startup
const clearCorruptedDataOnStartup = async () => {
  try {
    console.log('🔍 Checking for corrupted AsyncStorage data on startup...');
    const keys = ['user', 'notifications', 'guestCalculations', 'sentEmails', 'systemLogs'];
    
    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value && value.trim()) {
          const trimmed = value.trim();
          
          // Check for corruption patterns
          if (trimmed.includes('object Object') || trimmed.includes('[object') ||
              trimmed.includes('NaN') || trimmed.includes('Infinity') ||
              trimmed.includes('Unexpected character') ||
              (!trimmed.startsWith('{') && !trimmed.startsWith('[')) ||
              (!trimmed.endsWith('}') && !trimmed.endsWith(']'))) {
            console.warn(`⚠️ Detected corrupted data in ${key}, clearing...`);
            await AsyncStorage.removeItem(key);
            continue;
          }
          
          // Try to parse to validate JSON
          JSON.parse(trimmed);
          console.log(`✅ ${key} data is valid`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to validate ${key}, clearing corrupted data:`, error);
        await AsyncStorage.removeItem(key);
      }
    }
    console.log('✅ AsyncStorage validation complete');
  } catch (error) {
    console.error('❌ Failed to validate AsyncStorage on startup:', error);
  }
};

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { theme } = useTheme();
  
  const headerStyle = {
    backgroundColor: theme.headerBackground,
  };
  
  const headerTitleStyle = {
    color: theme.headerText,
  };
  
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle,
      headerTintColor: theme.headerText,
      headerTitleStyle,
    }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="main" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ presentation: "card" }} />
      <Stack.Screen name="profile" options={{ presentation: "card" }} />
      <Stack.Screen name="admin" options={{ presentation: "card" }} />
      <Stack.Screen name="saved-calculations" options={{ presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Clear any corrupted data before showing the app
    clearCorruptedDataOnStartup().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <AuthProvider>
            <ThemeProvider>
              <SettingsProvider>
                <NotificationsProvider>
                  <MenuProvider>
                    <CalculatorsProvider>
                      <CalculationsProvider>
                        <RootLayoutNav />
                        <NotificationOverlay />
                      </CalculationsProvider>
                    </CalculatorsProvider>
                  </MenuProvider>
                </NotificationsProvider>
              </SettingsProvider>
            </ThemeProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});