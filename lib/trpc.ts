import Constants from "expo-constants";
import { Platform } from "react-native";
import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

// 1. Try environment variable from app.config.js (expo extra)
const ENV_BASE =
  (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE;

// 2. Fallbacks if no env is provided
const FALLBACK_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:3001"
    : Platform.OS === "web"
    ? "http://localhost:3001"
    : "http://localhost:3001";

// 3. Final base URL (env > fallback)
const apiBase = (ENV_BASE || FALLBACK_BASE).replace(/\/$/, "");
const trpcUrl = `${apiBase}/api/trpc`;

console.log("🔗 API Base URL:", apiBase);
console.log("🔗 tRPC URL:", trpcUrl);

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: trpcUrl,
      fetch(url, opts) {
        return fetch(url, { ...opts, credentials: "include" });
      },
    }),
  ],
});
