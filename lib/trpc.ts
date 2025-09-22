import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('🌐 Using configured base URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback for development
  const fallbackUrl = 'https://rork.com';
  console.log('⚠️ No EXPO_PUBLIC_RORK_API_BASE_URL found, using fallback:', fallbackUrl);
  return fallbackUrl;
};

const baseUrl = getBaseUrl();
const trpcUrl = `${baseUrl}/api/trpc`;
console.log('🔗 tRPC URL:', trpcUrl);

// Test the tRPC endpoint with timeout
const healthCheckController = new AbortController();
setTimeout(() => healthCheckController.abort(), 3000); // 3 second timeout for health check

fetch(`${baseUrl}/api/`, { signal: healthCheckController.signal })
  .then(response => {
    console.log('🏥 API health check status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('🏥 API health check response:', data);
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.error('❌ API health check timed out after 3 seconds');
    } else {
      console.error('❌ API health check failed:', error);
    }
  });

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: trpcUrl,
      transformer: superjson,
      async headers() {
        // Get user token from AsyncStorage for authentication
        try {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser && storedUser.trim()) {
            try {
              const user = JSON.parse(storedUser);
              if (user && typeof user === 'object' && user.id) {
                return {
                  authorization: `Bearer ${user.id}`,
                };
              } else {
                throw new Error('Invalid user data format');
              }
            } catch (parseError) {
              console.error('Failed to parse stored user for auth:', parseError);
              // Clear corrupted data
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('rememberMe');
            }
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return {};
      },
      fetch(url, options) {
        console.log('🌐 tRPC fetch request:', url, options?.method || 'GET');
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const fetchOptions = {
          ...options,
          signal: controller.signal,
        };
        
        return fetch(url, fetchOptions).then(async response => {
          clearTimeout(timeoutId);
          console.log('📡 tRPC response status:', response.status, response.statusText);
          
          if (!response.ok) {
            console.error('❌ tRPC response not ok:', response.status, response.statusText);
            
            // Try to get the response text to see what's being returned
            try {
              const responseText = await response.clone().text();
              console.error('❌ Response body:', responseText.substring(0, 500));
              
              // Check if it's HTML (error page)
              if (responseText.trim().startsWith('<')) {
                console.error('❌ Server returned HTML instead of JSON - likely a routing or CORS issue');
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
              }
            } catch (textError) {
              console.error('❌ Could not read response text:', textError);
            }
          }
          
          return response;
        }).catch(error => {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error('❌ tRPC request timed out after 5 seconds');
            throw new Error('Request timed out');
          }
          console.error('❌ tRPC fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});