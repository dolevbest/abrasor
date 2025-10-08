import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getDatabase, DbAccessRequest } from '@/backend/db/mysql_schema';
import { TRPCError } from '@trpc/server';

const upgradeGuestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  company: z.string().min(1),
  position: z.string().min(1),
  country: z.string().min(1),
  preferredUnits: z.enum(['metric', 'imperial']),
  sessionId: z.string().optional()
});

export const upgradeGuestProcedure = publicProcedure
  .input(upgradeGuestSchema)
  .mutation(async ({ input }) => {
    const { email, name, password, company, position, country, preferredUnits, sessionId } = input;
    const db = getDatabase();
    
    try {
      // Check if user already exists in requests
      const existingRequest = db.prepare('SELECT * FROM access_requests WHERE email = ?').get(email);
      if (existingRequest) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A request with this email already exists'
        });
      }

      // Check if user is already approved
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists'
        });
      }

      const newRequest: DbAccessRequest = {
        id: Date.now().toString(),
        email,
        name,
        password, // In production, this should be hashed
        company,
        position,
        country,
        preferred_units: preferredUnits,
        role: 'starter',
        status: 'pending',
        created_at: new Date().toISOString(),
        request_date: new Date().toISOString(),
      };

      // Add to access requests
      db.prepare(`
        INSERT INTO access_requests (
          id, email, name, password, company, position, country, 
          preferred_units, role, status, created_at, request_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newRequest.id,
        newRequest.email,
        newRequest.name,
        newRequest.password,
        newRequest.company,
        newRequest.position,
        newRequest.country,
        newRequest.preferred_units,
        newRequest.role,
        newRequest.status,
        newRequest.created_at,
        newRequest.request_date
      );
      
      // If sessionId is provided, transfer guest calculations to the request
      if (sessionId) {
        try {
          // Get guest calculations
          const guestCalculations = db.prepare(`
            SELECT * FROM visitor_calculations 
            WHERE visitor_id = ? 
            ORDER BY timestamp DESC
          `).all(sessionId);
          
          // Store them as a note in the access request for admin review
          if (guestCalculations.length > 0) {
            const calculationsNote = `Guest had ${guestCalculations.length} calculations before upgrading.`;
            
            // Add log entry about the transfer
            db.prepare(`
              INSERT INTO system_logs (id, type, message, timestamp, user)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              Date.now().toString(),
              'info',
              `Guest user ${name} (${email}) upgraded to account request with ${guestCalculations.length} existing calculations`,
              new Date().toISOString(),
              email
            );
          }
          
          // Clean up guest session
          db.prepare('DELETE FROM visitor_calculations WHERE visitor_id = ?').run(sessionId);
          db.prepare('DELETE FROM visitor_sessions WHERE id = ?').run(sessionId);
          
        } catch (error) {
          console.warn('Failed to transfer guest calculations:', error);
          // Don't fail the whole request if calculation transfer fails
        }
      }
      
      // Send confirmation email record (simulated)
      const userEmailRecord = {
        id: Date.now().toString(),
        from_email: 'noreplay.cgw@gmail.com',
        to_email: email,
        subject: 'CGWise Account Upgrade Request Received',
        body: `Dear ${name},\n\nThank you for upgrading from guest access to a full CGWise account. Your request has been received and is currently under review.\n\nRequest Details:\n- Name: ${name}\n- Email: ${email}\n- Company: ${company}\n- Position: ${position}\n- Country: ${country}\n\nYou will receive another email once your request has been reviewed by our administrators.\n\nBest regards,\nCGWise Team`,
        type: 'request',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      
      db.prepare(`
        INSERT INTO email_records (
          id, from_email, to_email, subject, body, type, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userEmailRecord.id,
        userEmailRecord.from_email,
        userEmailRecord.to_email,
        userEmailRecord.subject,
        userEmailRecord.body,
        userEmailRecord.type,
        userEmailRecord.sent_at,
        userEmailRecord.status
      );
      
      // Send notification email to admin (simulated)
      const adminEmailRecord = {
        id: (Date.now() + 1).toString(),
        from_email: 'noreplay.cgw@gmail.com',
        to_email: 'dolevb@cgwheels.com',
        subject: 'Guest Upgrade Request - CGWise',
        body: `A guest user has requested to upgrade to a full account:\n\nUser Details:\n- Name: ${name}\n- Email: ${email}\n- Company: ${company}\n- Position: ${position}\n- Country: ${country}\n- Preferred Units: ${preferredUnits}\n\nThis user was previously using guest access and has now requested a full account.\n\nPlease review this request in the admin panel.\n\nCGWise Admin System`,
        type: 'request',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      
      db.prepare(`
        INSERT INTO email_records (
          id, from_email, to_email, subject, body, type, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminEmailRecord.id,
        adminEmailRecord.from_email,
        adminEmailRecord.to_email,
        adminEmailRecord.subject,
        adminEmailRecord.body,
        adminEmailRecord.type,
        adminEmailRecord.sent_at,
        adminEmailRecord.status
      );
      
      // Add log entry
      db.prepare(`
        INSERT INTO system_logs (id, type, message, timestamp, user)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Date.now().toString(),
        'info',
        `Guest user ${name} (${email}) from ${company} requested account upgrade - Confirmation emails sent`,
        new Date().toISOString(),
        email
      );
      
      return { success: true, message: 'Account upgrade request submitted successfully' };
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Upgrade guest error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while processing your upgrade request'
      });
    }
  });