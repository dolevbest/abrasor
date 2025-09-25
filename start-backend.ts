#!/usr/bin/env bun

// Simple script to start the backend server
// Usage: bun run start-backend.ts

import { serve } from "bun";
import app from "./backend/hono";

const port = process.env.PORT || 3001;

console.log("🚀 Starting Abrasor Backend Server...");
console.log(`📍 Backend:           http://localhost:${port}/api`);
console.log(`📡 tRPC endpoint:     http://localhost:${port}/api/trpc`);
console.log("");
console.log("Press Ctrl+C to stop the server");
console.log("=".repeat(50));

serve({
  fetch: app.fetch,
  port: Number(port),
});