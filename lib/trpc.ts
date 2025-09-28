import Constants from "expo-constants";
import { Platform } from "react-native";
import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

// Get API base URL with better environment handling
const getApiBase = () => {
  // 1. Try environment variable from app.config.js
  const envBase = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE 
    || process.env.EXPO_PUBLIC_API_BASE;
  
  if (envBase) {
    console.log("📡 Using environment API base:", envBase);
    console.log("📱 Platform:", Platform.OS);
    console.log("🔧 Constants available:", !!Constants);
    return envBase.replace(/\/$/, "");
  }
  
  // 2. Platform-specific fallbacks
  let fallback: string;
  
  if (Platform.OS === "android") {
    // For Android device/emulator, try tunnel URL first, then fallback
    console.warn("⚠️ No environment API base found for Android!");
    console.warn("⚠️ Make sure EXPO_PUBLIC_API_BASE is set in .env");
    fallback = "http://10.0.2.2:3001";
  } else if (Platform.OS === "web") {
    // For web development
    fallback = "http://localhost:3001";
  } else {
    // For iOS simulator, localhost should work
    fallback = "http://localhost:3001";
  }
  
  console.log("📡 Using fallback API base:", fallback);
  console.warn("⚠️ Consider setting EXPO_PUBLIC_API_BASE in your .env file");
  return fallback;
};

const apiBase = getApiBase();
const trpcUrl = `${apiBase}/api/trpc`;

console.log("🔗 Final tRPC URL:", trpcUrl);

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: trpcUrl,
      fetch(url, opts) {
        console.log("🌐 Making tRPC request to:", url);
        console.log("📱 Platform:", Platform.OS);
        
        return fetch(url, { 
          ...opts, 
          credentials: "include",
          headers: {
            ...opts?.headers,
            'Content-Type': 'application/json',
          },
          // Add timeout for better error handling
        }).catch(error => {
          console.error("❌ tRPC fetch error:", error);
          console.error("🔗 Failed URL:", url);
          console.error("📱 Platform:", Platform.OS);
          throw error;
        });
      },
    }),
  ],
});
