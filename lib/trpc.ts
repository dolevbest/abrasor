import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const clearCorruptedData = async () => {
  try {
    console.log('🩹 Clearing potentially corrupted AsyncStorage data...');
    const keys = ['user', 'rememberMe', 'settings', 'calculations', 'notifications', 'guestMode'];
    await AsyncStorage.multiRemove(keys);
    console.log('✅ Cleared AsyncStorage data');
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
};

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    console.log('🌐 Using configured base URL:', envUrl);
    return envUrl.trim();
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    console.log('🌐 Using same-origin (relative) base URL for web');
    return '';
  }

  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
  };
  const hostUri = anyConstants.expoConfig?.hostUri ?? '';
  const dbgHost = anyConstants.expoGoConfig?.debuggerHost ?? '';
  const fromDebugHost = dbgHost ? dbgHost.split(':')[0] : '';
  const host = hostUri ? hostUri.split(':')[0] : fromDebugHost;
  if (host) {
    const protocol = host.includes('127.0.0.1') || host.includes('localhost') || host.startsWith('10.') || host.startsWith('192.168.') ? 'http' : 'https';
    const derived = `${protocol}://${host}`;
    console.log('🌐 Derived base URL from Expo host:', derived);
    return derived;
  }

  console.warn('⚠️ Could not determine API base URL. Using relative path which may fail on native. Set EXPO_PUBLIC_RORK_API_BASE_URL.');
  return '';
};

const baseUrl = getBaseUrl();
const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
const trpcUrl = `${apiBase}/trpc`;
console.log('🔗 tRPC URL:', trpcUrl);

const performHealthCheck = async () => {
  const healthCheckController = new AbortController();
  const timeoutId = setTimeout(() => healthCheckController.abort(), 10000);
  try {
    const response = await fetch(`${apiBase}/`, {
      signal: healthCheckController.signal,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    console.log('🏥 API health check status:', response.status);
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log('🏥 API health check response:', data);
      console.log('✅ API is healthy and reachable');
    } else {
      console.warn('⚠️ API health check returned non-200 status:', response.status);
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      console.error('❌ API health check timed out after 10 seconds');
    } else {
      console.error('❌ API health check failed:', error);
      console.error('❌ This may indicate network issues or server problems');
    }
  }
};

performHealthCheck();

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: trpcUrl,
      async headers() {
        try {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser && storedUser.trim()) {
            try {
              const trimmed = storedUser.trim();
              if (!trimmed || trimmed === 'undefined' || trimmed === 'null' ||
                  trimmed.includes('object Object') || trimmed.includes('[object') ||
                  (!trimmed.startsWith('{') || !trimmed.endsWith('}'))) {
                console.warn('⚠️ Invalid user data format in AsyncStorage');
                await clearCorruptedData();
                return {};
              }
              const user = JSON.parse(trimmed) as { id?: string; email?: string };
              if (user && typeof user === 'object' && user.id) {
                console.log('🔑 Using auth token for user:', user.email ?? 'unknown');
                return { authorization: `Bearer ${user.id}` };
              } else {
                console.warn('⚠️ Invalid user data format - missing required fields');
                await clearCorruptedData();
              }
            } catch (parseError) {
              console.error('❌ Failed to parse stored user for auth:', parseError);
              console.error('❌ Corrupted user data:', storedUser.substring(0, 100));
              await clearCorruptedData();
            }
          }
        } catch (error) {
          console.error('❌ Error getting auth token:', error);
        }
        return {};
      },
      fetch(url, options) {
        console.log('🌐 tRPC fetch request:', url, options?.method ?? 'GET');
        const controller = new AbortController();
        const timeoutMs = 20000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const fetchOptions = { ...options, signal: controller.signal } as RequestInit;
        return fetch(url, fetchOptions).then(async response => {
          clearTimeout(timeoutId);
          console.log('📡 tRPC response status:', response.status, response.statusText);
          let responseText = '';
          try {
            responseText = await response.clone().text();
            console.log('📄 Response body preview:', responseText.substring(0, 200));
          } catch (textError) {
            console.error('❌ Could not read response text:', textError);
          }
          if (!response.ok) {
            console.error('❌ tRPC response not ok:', response.status, response.statusText);
            console.error('❌ Full response body:', responseText);
            if (responseText.trim().startsWith('<')) {
              console.error('❌ Server returned HTML instead of JSON - likely a routing or CORS issue');
              throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
            }
            if (!responseText.trim()) {
              console.error('❌ Server returned empty response');
              throw new Error(`Server returned empty response. Status: ${response.status}`);
            }
            try {
              if (!responseText.trim() || responseText.includes('object Object') || 
                  responseText.includes('[object') || responseText.includes('Unexpected character')) {
                throw new Error('Invalid JSON response format');
              }
              const errorData = JSON.parse(responseText) as unknown;
              console.error('❌ Server error response:', errorData);
              if (Array.isArray(errorData) && (errorData as any)[0]?.error?.message) {
                throw new Error((errorData as any)[0].error.message as string);
              }
              throw new Error(`Server error: ${response.status}`);
            } catch (parseError) {
              console.error('❌ Response is not valid JSON:', parseError);
              console.error('❌ Raw response:', responseText);
              throw new Error(`Server error: ${response.status} - ${response.statusText}`);
            }
          } else {
            if (responseText) {
              try {
                const trimmed = responseText.trim();
                if (!trimmed || trimmed.includes('object Object') || trimmed.includes('[object') ||
                    trimmed.includes('Unexpected character') || trimmed.includes('NaN') ||
                    trimmed.includes('Infinity')) {
                  throw new Error('Invalid JSON response format detected');
                }
                JSON.parse(trimmed);
                console.log('✅ Response is valid JSON');
              } catch (jsonError) {
                console.error('❌ Response is not valid JSON:', jsonError);
                console.error('❌ Invalid JSON response:', responseText.substring(0, 500));
                if (responseText.includes('Unexpected character') || responseText.includes('object Object')) {
                  console.error('❌ Detected JSON parse error - likely corrupted data');
                  await clearCorruptedData();
                  throw new Error('JSON Parse Error: Corrupted data detected and cleared. Please try again.');
                }
                throw new Error(`Invalid JSON response: ${String(jsonError)}`);
              }
            }
          }
          return response;
        }).catch(error => {
          clearTimeout(timeoutId);
          if ((error as any)?.name === 'AbortError') {
            console.error('❌ tRPC request timed out after 20000 ms');
            throw new Error('Request timed out. Please check your internet connection.');
          }
          console.error('❌ tRPC fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});