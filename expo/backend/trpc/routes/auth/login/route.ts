import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getDatabase, dbUserToUser, DbUser } from '@/backend/db/mysql_schema';
import { TRPCError } from '@trpc/server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false)
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password, rememberMe } = input;
    console.log('🔐 Login attempt for:', email, 'Remember me:', rememberMe);
    
    const db = getDatabase();
    
    try {
      // Check for maintenance mode (MySQL version)
      const [maintenanceRows] = await db.execute(
        'SELECT value FROM settings WHERE `key` = ?',
        ['maintenanceMode']
      );
      const maintenanceMode = (maintenanceRows as any[])[0];
      
      if (maintenanceMode?.value === 'true' && email !== 'dolevb@cgwheels.com') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System is currently under maintenance. Please try again later.'
        });
      }
      
      // Find user (MySQL version)
      const [userRows] = await db.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      const dbUser = (userRows as any[])[0] as DbUser | undefined;
      
      if (!dbUser) {
        console.log('❌ User not found:', email);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password'
        });
      }
      
      // Check password (in production, use bcrypt!)
      if (dbUser.password !== password) {
        console.log('❌ Invalid password for:', email);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password'
        });
      }
      
      // Check user status
      if (dbUser.status !== 'approved') {
        console.log('❌ User not approved:', email, 'Status:', dbUser.status);
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your account is ${dbUser.status}. Please contact an administrator.`
        });
      }
      
      // Update last login
      await db.execute(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [new Date(), dbUser.id]
      );
      
      console.log('✅ Login successful for:', email);
      
      return {
        user: dbUserToUser(dbUser),
        rememberMe
      };
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('❌ Login error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during login'
      });
    }
  });