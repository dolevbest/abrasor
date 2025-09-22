import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility to safely clear corrupted AsyncStorage data
const clearCorruptedData = async () => {
  try {
    console.log('🧹 Clearing potentially corrupted AsyncStorage data...');
    const keys = ['user', 'rememberMe', 'settings', 'calculations', 'notifications', 'guestMode'];
    await AsyncStorage.multiRemove(keys);
    console.log('✅ Cleared AsyncStorage data');
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
};

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
// Perform health check with better error handling
const performHealthCheck = async () => {
  const healthCheckController = new AbortController();
  const timeoutId = setTimeout(() => healthCheckController.abort(), 5000); // 5 second timeout
  
  try {
    const response = await fetch(`${baseUrl}/api/`, { 
      signal: healthCheckController.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    console.log('🏥 API health check status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🏥 API health check response:', data);
      console.log('✅ API is healthy and reachable');
    } else {
      console.warn('⚠️ API health check returned non-200 status:', response.status);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('❌ API health check timed out after 5 seconds');
    } else {
      console.error('❌ API health check failed:', error);
      console.error('❌ This may indicate network issues or server problems');
    }
  }
};

// Run health check
performHealthCheck();

// Create tRPC client with enhanced error handling
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
              // Validate JSON before parsing
              if (!storedUser.startsWith('{') || !storedUser.endsWith('}')) {
                console.warn('⚠️ Invalid user data format in AsyncStorage');
                await clearCorruptedData();
                return {};
              }
              
              const user = JSON.parse(storedUser);
              if (user && typeof user === 'object' && user.id) {
                console.log('🔑 Using auth token for user:', user.email);
                return {
                  authorization: `Bearer ${user.id}`,
                };
              } else {
                console.warn('⚠️ Invalid user data format - missing required fields');
                await clearCorruptedData();
              }
            } catch (parseError) {
              console.error('❌ Failed to parse stored user for auth:', parseError);
              // Clear all potentially corrupted data
              await clearCorruptedData();
            }
          }
        } catch (error) {
          console.error('❌ Error getting auth token:', error);
        }
        return {};
      },
      fetch(url, options) {
        console.log('🌐 tRPC fetch request:', url, options?.method || 'GET');
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const fetchOptions = {
          ...options,
          signal: controller.signal,
        };
        
        return fetch(url, fetchOptions).then(async response => {
          clearTimeout(timeoutId);
          console.log('📡 tRPC response status:', response.status, response.statusText);
          
          // Always try to read the response text first for debugging
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
            
            // Check if it's HTML (error page)
            if (responseText.trim().startsWith('<')) {
              console.error('❌ Server returned HTML instead of JSON - likely a routing or CORS issue');
              throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
            }
            
            // Check if response is empty
            if (!responseText.trim()) {
              console.error('❌ Server returned empty response');
              throw new Error(`Server returned empty response. Status: ${response.status}`);
            }
            
            // Try to parse as JSON to see if it's a valid error response
            try {
              const errorData = JSON.parse(responseText);
              console.error('❌ Server error response:', errorData);
              
              // Extract the actual error message from tRPC error format
              if (errorData && Array.isArray(errorData) && errorData[0] && errorData[0].error) {
                const tRPCError = errorData[0].error;
                if (tRPCError.message) {
                  throw new Error(tRPCError.message);
                }
              }
              
              throw new Error(`Server error: ${response.status}`);
            } catch (parseError) {
              console.error('❌ Response is not valid JSON:', parseError);
              console.error('❌ Raw response:', responseText);
              throw new Error(`Server error: ${response.status} - ${response.statusText}`);
            }
          } else {
            // Check if successful response is valid JSON for superjson compatibility
            if (responseText) {
              try {
                // Try to parse the response to catch JSON errors early
                JSON.parse(responseText);
                console.log('✅ Response is valid JSON');
              } catch (jsonError) {
                console.error('❌ Response is not valid JSON:', jsonError);
                console.error('❌ Invalid JSON response:', responseText.substring(0, 500));
                
                // Check for specific JSON parse error patterns
                if (responseText.includes('Unexpected character: o') || responseText.includes('Unexpected character')) {
                  console.error('❌ Detected JSON parse error - likely corrupted data');
                  // Clear corrupted AsyncStorage data
                  await clearCorruptedData();
                  throw new Error('JSON Parse Error: Corrupted data detected and cleared. Please try again.');
                }
                
                throw new Error(`Invalid JSON response: ${jsonError}`);
              }
            }
          }
          
          return response;
        }).catch(error => {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error('❌ tRPC request timed out after 8 seconds');
            throw new Error('Request timed out. Please check your internet connection.');
          }
          console.error('❌ tRPC fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});