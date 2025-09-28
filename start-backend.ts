#!/usr/bin/env node

import { serve } from "@hono/node-server";
import app from "./backend/hono";
import 'dotenv/config';

const port = process.env.PORT || 3001;

console.log("🚀 Starting Abrasor Backend Server...");
console.log(`📍 Environment:       ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Database Host:     ${process.env.DB_HOST || 'localhost'}`);
console.log(`📍 Backend:           http://0.0.0.0:${port}/api`);
console.log(`📡 tRPC endpoint:     http://0.0.0.0:${port}/api/trpc`);
console.log("");
console.log("Press Ctrl+C to stop the server");
console.log("=".repeat(50));

serve({
  fetch: app.fetch,
  port: Number(port),
  hostname: '0.0.0.0', // Listen on all interfaces
});

console.log(`✅ Backend server running on http://0.0.0.0:${port}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});
