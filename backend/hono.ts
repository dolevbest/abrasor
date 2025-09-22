import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { initDatabase } from "./db/schema";

// Initialize database on startup
console.log('🚀 Starting database initialization...');
const db = initDatabase();
console.log('✅ Database initialized');

// Test database connection
try {
  const testQuery = db.prepare('SELECT COUNT(*) as count FROM calculators').get() as { count: number };
  console.log('📊 Calculators in database:', testQuery.count);
} catch (error) {
  console.error('❌ Database test failed:', error);
}

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;