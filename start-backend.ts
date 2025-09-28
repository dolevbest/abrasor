#!/usr/bin/env node

// Simple script to start the backend server
// Usage: node start-backend.js or tsx start-backend.ts

import { serve } from "@hono/node-server";
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
  hostname: '0.0.0.0',
});

console.log(`✅ Backend server running on http://localhost:${port}`);
console.log(`📡 API endpoints available at http://localhost:${port}/api`);
console.log(`🔗 tRPC endpoints available at http://localhost:${port}/api/trpc`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});