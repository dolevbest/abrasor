import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { initDatabase } from "@/backend/db/schema";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Initialize database on first request
  const db = initDatabase();
  
  return {
    req: opts.req,
    db,
    // You can add more context items here like auth, etc.
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;