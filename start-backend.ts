#!/usr/bin/env bun

// Simple script to start the backend server
// Usage: bun run start-backend.ts

import { $ } from "bun";

console.log("🚀 Starting Abrasor Backend Server...");
console.log("📍 This will start the backend on http://localhost:3001");
console.log("🔗 API will be available at http://localhost:3001/api");
console.log("📡 tRPC endpoints at http://localhost:3001/api/trpc");
console.log("");
console.log("Press Ctrl+C to stop the server");
console.log("=" .repeat(50));

try {
  await $`bun run backend/server.ts`;
} catch (error) {
  console.error("❌ Failed to start backend server:", error);
  process.exit(1);
}