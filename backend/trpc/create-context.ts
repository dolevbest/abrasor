import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { initDatabase, getDatabase, dbUserToUser, DbUser } from "@/backend/db/schema";
import { User } from "@/types";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Initialize database on first request
  const db = initDatabase();
  
  // Extract user from session/token if available
  let user: User | null = null;
  
  // Check for authorization header
  const authHeader = opts.req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // For simplicity, we'll use the token as user ID
    // In production, you'd validate JWT tokens here
    try {
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ? AND status = "approved"').get(token) as DbUser | undefined;
      if (dbUser) {
        user = dbUserToUser(dbUser);
      }
    } catch (error) {
      console.error('Error fetching user from token:', error);
    }
  }
  
  return {
    req: opts.req,
    db,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});