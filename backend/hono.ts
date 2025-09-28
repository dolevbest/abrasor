import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import superjson from "superjson";
import 'dotenv/config'; // Add this line

const app = new Hono();

// Enable CORS with more specific configuration
app.use("*", cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : true, // Allow all origins in development
  credentials: true,
}));

// Health check route
app.get("/api", (c) =>
  c.json({
    status: "ok",
    message: "API running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
);

// Add this test route before your tRPC mount
app.get("/api/test", (c) => {
  return c.json({
    status: "success",
    message: "Connection working!",
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(c.req.raw.headers.entries())
  });
});

// Mount tRPC at /api/trpc
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    transformer: superjson,
  })
);

export default app;
