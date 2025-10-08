#!/usr/bin/env node
import 'dotenv/config';
import { serve } from "@hono/node-server";
import app from "./backend/hono";
import { initDatabase } from "./backend/db/mysql_schema";

const port = process.env.PORT || 3001;

console.log("🚀 Starting Abrasor Backend Server...");
console.log(`📍 Environment:       ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Database Host:     ${process.env.DB_HOST || 'localhost'}`);
console.log(`📍 Database Port:     ${process.env.DB_PORT || '3306'}`);
console.log(`📍 Database Name:     ${process.env.DB_NAME || 'abrasor_db'}`);
console.log(`📍 Backend:           http://0.0.0.0:${port}/api`);
console.log(`📡 tRPC endpoint:     http://0.0.0.0:${port}/api/trpc`);
console.log("");
console.log("Press Ctrl+C to stop the server");
console.log("=".repeat(50));

// Initialize database before starting server
async function startServer() {
  try {
    // Initialize database connection
    console.log("🔌 Connecting to MySQL database...");
    await initDatabase();
    console.log("✅ Database initialized successfully");
    
    // Start HTTP server
    serve({
      fetch: app.fetch,
      port: Number(port),
      hostname: '0.0.0.0',
    });
    
    console.log(`✅ Backend server running on http://0.0.0.0:${port}`);
    console.log(`📡 API endpoints available at http://0.0.0.0:${port}/api`);
    console.log(`🔗 tRPC endpoints available at http://0.0.0.0:${port}/api/trpc`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});