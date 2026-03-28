import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import superjson from "superjson";
import 'dotenv/config';

const app = new Hono();

// Fixed CORS configuration
app.use("*", cors({
  origin: '*', // Allow all origins in development
  credentials: true,
}));

// Health check route
app.get("/api", (c) =>
  c.json({
    status: "ok",
    message: "API running",
    timestamp: new Date().toISOString(),
  })
);

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