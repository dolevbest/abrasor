import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { initDatabase, getDatabase, dbUserToUser } from "@/backend/db/mysql-schema";
import { User } from "@/types";
import 'dotenv/config'; // Load environment variables

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Initialize database on first request
  const db = await initDatabase();
  
  // Extract user from session/token if available
  let user: User | null = null;
  
  // Check for authorization header
  const authHeader = opts.req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const [rows] = await db.execute(
        'SELECT * FROM users WHERE id = ? AND status = "approved"',
        [token]
      );
      
      if ((rows as any[]).length > 0) {
        user = dbUserToUser((rows as any[])[0]);
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

// Rest of the file remains the same...
