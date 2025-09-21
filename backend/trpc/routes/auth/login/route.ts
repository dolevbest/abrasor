import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getDatabase, dbUserToUser, DbUser } from '@/backend/db/schema';
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
    const db = getDatabase();
    
    try {
      // Check for maintenance mode
      const maintenanceMode = db.prepare('SELECT value FROM settings WHERE key = ?').get('maintenanceMode') as { value: string } | undefined;
      if (maintenanceMode?.value === 'true' && email !== 'dolevb@cgwheels.com') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System is currently under maintenance. Please try again later.'
        });
      }
      
      // Get max login attempts setting
      const maxAttemptsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('maxLoginAttempts') as { value: string } | undefined;
      const MAX_ATTEMPTS = parseInt(maxAttemptsRow?.value || '5');
      const LOCKOUT_DURATION_MINUTES = 15;
      
      // Check if user exists
      const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DbUser | undefined;
      const isAdminUser = email === 'dolevb@cgwheels.com' || (dbUser && dbUser.role === 'admin');
      
      // Check for account lockout (skip for admin users)
      if (!isAdminUser) {
        const loginAttempt = db.prepare('SELECT * FROM login_attempts WHERE email = ?').get(email) as any;
        
        if (loginAttempt && loginAttempt.locked_until) {
          const lockTime = new Date(loginAttempt.locked_until);
          const now = new Date();
          
          if (lockTime > now) {
            const minutesLeft = Math.ceil((lockTime.getTime() - now.getTime()) / (1000 * 60));
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: `Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
            });
          } else {
            // Lock period expired, reset attempts
            db.prepare('UPDATE login_attempts SET attempts = 0, locked_until = NULL WHERE email = ?').run(email);
          }
        }
      }
      
      // Helper function to handle failed login
      const handleFailedLogin = (errorMessage: string) => {
        if (isAdminUser) {
          // Log the failed attempt for admin users but don't lock them out
          db.prepare(`
            INSERT INTO system_logs (id, type, message, timestamp, user)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            Date.now().toString(),
            'info',
            `Admin user ${email} failed login attempt (admins exempt from lockout)`,
            new Date().toISOString(),
            email
          );
          throw new TRPCError({ code: 'UNAUTHORIZED', message: errorMessage });
        }
        
        // Regular user login attempt tracking
        const now = new Date();
        const loginAttempt = db.prepare('SELECT * FROM login_attempts WHERE email = ?').get(email) as any;
        
        if (!loginAttempt) {
          // First failed attempt for this email
          db.prepare(`
            INSERT INTO login_attempts (id, email, attempts, last_attempt)
            VALUES (?, ?, ?, ?)
          `).run(Date.now().toString(), email, 1, now.toISOString());
        } else {
          // Increment attempts
          const newAttempts = loginAttempt.attempts + 1;
          
          if (newAttempts >= MAX_ATTEMPTS) {
            const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
            
            db.prepare(`
              UPDATE login_attempts 
              SET attempts = ?, last_attempt = ?, locked_until = ?
              WHERE email = ?
            `).run(newAttempts, now.toISOString(), lockUntil.toISOString(), email);
            
            // Log the lockout
            db.prepare(`
              INSERT INTO system_logs (id, type, message, timestamp, user)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              Date.now().toString(),
              'warning',
              `Account ${email} locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_ATTEMPTS} failed login attempts`,
              now.toISOString(),
              email
            );
            
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: `Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
            });
          } else {
            db.prepare(`
              UPDATE login_attempts 
              SET attempts = ?, last_attempt = ?
              WHERE email = ?
            `).run(newAttempts, now.toISOString(), email);
          }
        }
        
        const remainingAttempts = MAX_ATTEMPTS - (loginAttempt?.attempts || 1);
        if (remainingAttempts <= 2 && remainingAttempts > 0) {
          const warningMessage = `${errorMessage}\n\nWarning: ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before account lockout.`;
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: warningMessage
          });
        }
        
        throw new TRPCError({ code: 'UNAUTHORIZED', message: errorMessage });
      };
      
      if (dbUser) {
        // Check password
        if (dbUser.password !== password) {
          handleFailedLogin('Invalid credentials. Please check your email and password.');
          return; // This line won't be reached due to throw in handleFailedLogin
        }
        
        if (dbUser.status === 'approved') {
          // Update last login
          db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(
            new Date().toISOString(),
            dbUser.id
          );
          
          // Clear login attempts for this user (only for non-admin users)
          if (!isAdminUser) {
            db.prepare('DELETE FROM login_attempts WHERE email = ?').run(email);
          }
          
          const updatedUser = { ...dbUser, last_login: new Date().toISOString() };
          return {
            user: dbUserToUser(updatedUser),
            rememberMe
          };
        } else if (dbUser.status === 'pending') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your account is pending approval. Please wait for admin approval.'
          });
        } else if (dbUser.status === 'rejected' || dbUser.status === 'suspended') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your account access has been denied. Please contact support.'
          });
        }
      }
      
      // Check if user has a pending request
      const pendingRequest = db.prepare('SELECT * FROM access_requests WHERE email = ?').get(email);
      if (pendingRequest) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your access request is pending approval. Please wait for admin review.'
        });
      }
      
      handleFailedLogin('Invalid credentials or user not found. Please check your email and password or request access.');
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Login error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during login'
      });
    }
  });