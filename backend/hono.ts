import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { initDatabase } from "./db/schema";
import superjson from "superjson";

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

// Enable CORS for all routes with proper configuration
app.use("*", cors({
  origin: true, // Allow all origins in development
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
    transformer: superjson,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Test endpoint for debugging
app.get("/test", (c) => {
  return c.json({ 
    message: "Backend server is working!",
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(c.req.header()),
    url: c.req.url
  });
});

export default app;