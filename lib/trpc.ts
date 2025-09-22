import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        // Get user token from AsyncStorage for authentication
        try {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              return {
                authorization: `Bearer ${user.id}`,
              };
            } catch (parseError) {
              console.error('Failed to parse stored user for auth:', parseError);
              // Clear corrupted data
              await AsyncStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return {};
      },
    }),
  ],
});