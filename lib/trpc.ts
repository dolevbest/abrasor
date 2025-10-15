import Constants from "expo-constants";
import { Platform } from "react-native";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";  // Changed from httpLink
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

// Get API base URL with better environment handling
const getApiBase = () => {
  const envBase = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE 
    || process.env.EXPO_PUBLIC_API_BASE;
  
  if (envBase) {
    console.log("📡 Using environment API base:", envBase);
    return envBase.replace(/\/$/, "");
  }
  
  let fallback: string;
  
  if (Platform.OS === "android") {
    fallback = "http://10.0.2.2:3001";
  } else if (Platform.OS === "web") {
    fallback = "http://localhost:3001";
  } else {
    fallback = "http://localhost:3001";
  }
  
  console.log("📡 Using fallback API base:", fallback);
  return fallback;
};

const apiBase = getApiBase();
const trpcUrl = `${apiBase}/api/trpc`;
console.log("🔗 Final tRPC URL:", trpcUrl);

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({  // Changed to httpBatchLink
      url: trpcUrl,
      headers: () => ({
        'Content-Type': 'application/json',
      }),
      // Add fetch with better error handling
      fetch(url, opts) {
        console.log("🌐 Making tRPC request to:", url);
        console.log("📦 Request options:", JSON.stringify(opts, null, 2));
        
        // Log the body being sent
        if (opts?.body) {
          console.log("📤 Request body:", opts.body);
        }
        
        return fetch(url, { 
          ...opts,
          headers: {
            ...opts?.headers,
            'Content-Type': 'application/json',
          },
        }).then(response => {
          console.log("📥 Response status:", response.status);
          return response;
        }).catch(error => {
          console.error("❌ tRPC fetch error:", error);
          console.error("🔗 Failed URL:", url);
          throw error;
        });
      },
    }),
  ],
});