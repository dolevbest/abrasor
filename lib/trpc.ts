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
  // For Rork platform, use the tunnel URL from the start script
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    console.log('🌐 Using configured base URL:', envUrl);
    return envUrl.trim().replace(/\/$/, '');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    console.log('🌐 Using web origin for base URL:', origin);
    return origin.replace(/\/$/, '');
  }

  // For Rork development environment, try to use the tunnel URL
  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest?: { debuggerHost?: string; hostUri?: string };
  };

  const hostUri = anyConstants.expoConfig?.hostUri ?? anyConstants.manifest?.hostUri ?? '';
  const dbgHost = anyConstants.expoGoConfig?.debuggerHost ?? anyConstants.manifest?.debuggerHost ?? '';

  const hostPort = (hostUri || dbgHost).trim();
  if (hostPort) {
    const [host, port] = hostPort.split(':');
    // For Rork tunnel URLs, always use https
    const isRorkTunnel = host.includes('rork.com') || host.includes('tunnel');
    const isLocal = host.includes('127.0.0.1') || host.includes('localhost') || host.startsWith('10.') || host.startsWith('192.168.');
    const protocol = isRorkTunnel || !isLocal ? 'https' : 'http';
    const base = port && !isRorkTunnel ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
    console.log('🌐 Derived base URL from Expo host:', base);
    return base.replace(/\/$/, '');
  }

  // Fallback - for web use relative URLs, for mobile try localhost:3001 (backend server port)
  const fallbackUrl = Platform.OS === 'web' ? '' : 'http://localhost:3001';
  console.warn('⚠️ Could not determine API base URL. Using fallback:', fallbackUrl || 'relative');
  return fallbackUrl;
};

const baseUrl = getBaseUrl();
const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
const trpcUrl = `${apiBase}/trpc`;
console.log('🔗 tRPC URL:', trpcUrl);
console.log('🔗 API Base URL:', apiBase);
console.log('🔗 Base URL:', baseUrl || 'relative');
console.log('🔗 Platform:', Platform.OS);

const performHealthCheck = async () => {
  // Skip health check if no base URL is available
  if (!baseUrl && Platform.OS !== 'web') {
    console.warn('⚠️ Skipping health check - no base URL available');
    return;
  }

  const healthCheckController = new AbortController();
  const timeoutId = setTimeout(() => healthCheckController.abort(), 5000);
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
      console.warn('⚠️ API health check timed out after 5 seconds');
    } else {
      console.warn('⚠️ API health check failed:', error?.message || error);
      console.warn('⚠️ This may indicate the backend server is not running');
    }
  }
};

// Perform health check with delay to avoid blocking app startup
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  setTimeout(() => {
    performHealthCheck();
  }, 3000);
}

// Export a function to test backend connectivity
export const testBackendConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🧪 Testing backend connection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiBase}/`, {
      signal: controller.signal,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json().catch(() => ({ status: 'ok' }));
      console.log('✅ Backend connection test successful:', data);
      return { success: true, message: `Backend is running (Status: ${response.status})` };
    } else {
      console.warn('⚠️ Backend returned non-200 status:', response.status);
      return { success: false, message: `Backend returned status ${response.status}` };
    }
  } catch (error: any) {
    console.error('❌ Backend connection test failed:', error);
    
    if (error?.name === 'AbortError') {
      return { success: false, message: 'Connection timed out - backend may not be running' };
    }
    
    if (error?.message?.includes('Load failed') || error?.message?.includes('Network request failed')) {
      return { success: false, message: 'Unable to connect to backend server - please ensure it is running' };
    }
    
    return { success: false, message: `Connection error: ${error?.message || 'Unknown error'}` };
  }
};

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
        const timeoutMs = 15000; // Increased timeout for tunnel connections
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const fetchOptions = { 
          ...options, 
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          }
        } as RequestInit;
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
            console.error('❌ tRPC request timed out after 15 seconds');
            throw new Error('Request timed out. Please check your connection and ensure the backend server is running.');
          }
          console.error('❌ tRPC fetch error:', error);
          
          // Provide more helpful error messages based on error type
          if (error?.message?.includes('Load failed') || error?.message?.includes('Network request failed')) {
            const helpfulMessage = Platform.OS === 'web' 
              ? 'Unable to connect to server. The backend may not be running.'
              : 'Unable to connect to server. Please ensure the backend is running on localhost:3001 or check your network connection.';
            throw new Error(helpfulMessage);
          }
          
          if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
            throw new Error('Network error. Please check your internet connection.');
          }
          
          if (error?.message?.includes('CORS')) {
            throw new Error('Server configuration error. Please contact support.');
          }
          
          // Add specific error for connection refused (backend not running)
          if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('Connection refused')) {
            throw new Error('Backend server is not running. Please start the backend server first.');
          }
          
          throw error;
        });
      },
    }),
  ],
});