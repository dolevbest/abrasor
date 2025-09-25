// backend/hono.ts
import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import superjson from "superjson";

const app = new Hono();

// CORS (dev-friendly)
app.use("*", cors({
  origin: true,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

const transformer = superjson;

// Health under /api
app.get("/api", (c) => c.json({
  status: "ok",
  message: "API is running",
  timestamp: new Date().toISOString(),
  version: "1.0.0"
}));

// Debug under /api/test
app.get("/api/test", (c) => c.json({
  message: "Backend server is working!",
  timestamp: new Date().toISOString(),
  headers: Object.fromEntries(c.req.header()),
  url: c.req.url
}));

// Mount tRPC under /api/trpc
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
