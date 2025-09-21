import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/auth-context";
import { SettingsProvider } from "@/hooks/settings-context";
import { CalculationsProvider } from "@/hooks/calculations-context";
import { CalculatorsProvider } from "@/hooks/calculators-context";
import { ThemeProvider, useTheme } from "@/hooks/theme-context";
import { NotificationsProvider } from "@/hooks/notifications-context";
import NotificationOverlay from "@/components/NotificationOverlay";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="saved-calculations" options={{ presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <AuthProvider>
            <ThemeProvider>
              <SettingsProvider>
                <NotificationsProvider>
                  <CalculatorsProvider>
                    <CalculationsProvider>
                      <RootLayoutNav />
                      <NotificationOverlay />
                    </CalculationsProvider>
                  </CalculatorsProvider>
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