import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getDatabase, dbUserToUser, dbAccessRequestToAccessRequest, DbUser, DbAccessRequest } from '@/backend/db/mysql_schema';
import { TRPCError } from '@trpc/server';

// Get all users (admin only)
export const getUsersProcedure = publicProcedure
  .query(async () => {
    const db = getDatabase();
    
    try {
      const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as DbUser[];
      return users.map(dbUserToUser);
    } catch (error) {
      console.error('Get users error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users'
      });
    }
  });

// Get all access requests (admin only)
export const getAccessRequestsProcedure = publicProcedure
  .query(async () => {
    const db = getDatabase();
    
    try {
      const requests = db.prepare('SELECT * FROM access_requests ORDER BY request_date DESC').all() as DbAccessRequest[];
      return requests.map(dbAccessRequestToAccessRequest);
    } catch (error) {
      console.error('Get access requests error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch access requests'
      });
    }
  });

// Approve access request
const approveRequestSchema = z.object({
  requestId: z.string(),
  role: z.enum(['admin', 'premium', 'starter']).optional().default('starter')
});

export const approveRequestProcedure = publicProcedure
  .input(approveRequestSchema)
  .mutation(async ({ input }) => {
    const { requestId, role } = input;
    const db = getDatabase();
    
    try {
      // Get the request
      const request = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(requestId) as DbAccessRequest | undefined;
      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Access request not found'
        });
      }
      
      // Create user from request
      const newUser: DbUser = {
        id: Date.now().toString(),
        email: request.email,
        name: request.name,
        password: request.password,
        role: role,
        status: 'approved',
        unit_preference: request.preferred_units,
        company: request.company,
        position: request.position,
        country: request.country,
        created_at: new Date().toISOString(),
        last_login: undefined
      };
      
      // Insert user
      db.prepare(`
        INSERT INTO users (
          id, email, name, password, role, status, unit_preference, 
          company, position, country, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUser.id,
        newUser.email,
        newUser.name,
        newUser.password,
        newUser.role,
        newUser.status,
        newUser.unit_preference,
        newUser.company,
        newUser.position,
        newUser.country,
        newUser.created_at
      );
      
      // Remove from access requests
      db.prepare('DELETE FROM access_requests WHERE id = ?').run(requestId);
      
      // Send approval email (simulated)
      const approvalEmailRecord = {
        id: Date.now().toString(),
        from_email: 'noreplay.cgw@gmail.com',
        to_email: request.email,
        subject: 'CGWise Access Approved',
        body: `Dear ${request.name},\n\nGreat news! Your access request for CGWise has been approved.\n\nAccount Details:\n- Email: ${request.email}\n- Role: ${role}\n- Company: ${request.company}\n\nYou can now log in to CGWise using your email and the password you provided during registration.\n\nWelcome to CGWise!\n\nBest regards,\nCGWise Team`,
        type: 'approval',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      
      db.prepare(`
        INSERT INTO email_records (
          id, from_email, to_email, subject, body, type, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        approvalEmailRecord.id,
        approvalEmailRecord.from_email,
        approvalEmailRecord.to_email,
        approvalEmailRecord.subject,
        approvalEmailRecord.body,
        approvalEmailRecord.type,
        approvalEmailRecord.sent_at,
        approvalEmailRecord.status
      );
      
      // Add log entry
      db.prepare(`
        INSERT INTO system_logs (id, type, message, timestamp, user)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Date.now().toString(),
        'info',
        `Access request approved for ${request.name} (${request.email}) with role ${role}`,
        new Date().toISOString(),
        'admin'
      );
      
      return { success: true, user: dbUserToUser(newUser) };
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Approve request error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve request'
      });
    }
  });

// Reject access request
const rejectRequestSchema = z.object({
  requestId: z.string(),
  reason: z.string().optional()
});

export const rejectRequestProcedure = publicProcedure
  .input(rejectRequestSchema)
  .mutation(async ({ input }) => {
    const { requestId, reason } = input;
    const db = getDatabase();
    
    try {
      // Get the request
      const request = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(requestId) as DbAccessRequest | undefined;
      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Access request not found'
        });
      }
      
      // Remove from access requests
      db.prepare('DELETE FROM access_requests WHERE id = ?').run(requestId);
      
      // Send rejection email (simulated)
      const rejectionEmailRecord = {
        id: Date.now().toString(),
        from_email: 'noreplay.cgw@gmail.com',
        to_email: request.email,
        subject: 'CGWise Access Request Update',
        body: `Dear ${request.name},\n\nThank you for your interest in CGWise. After reviewing your access request, we are unable to approve it at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}If you have any questions or would like to discuss this further, please contact our support team.\n\nBest regards,\nCGWise Team`,
        type: 'rejection',
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      
      db.prepare(`
        INSERT INTO email_records (
          id, from_email, to_email, subject, body, type, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rejectionEmailRecord.id,
        rejectionEmailRecord.from_email,
        rejectionEmailRecord.to_email,
        rejectionEmailRecord.subject,
        rejectionEmailRecord.body,
        rejectionEmailRecord.type,
        rejectionEmailRecord.sent_at,
        rejectionEmailRecord.status
      );
      
      // Add log entry
      db.prepare(`
        INSERT INTO system_logs (id, type, message, timestamp, user)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Date.now().toString(),
        'info',
        `Access request rejected for ${request.name} (${request.email})${reason ? ` - Reason: ${reason}` : ''}`,
        new Date().toISOString(),
        'admin'
      );
      
      return { success: true };
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Reject request error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reject request'
      });
    }
  });

// Update user
const updateUserSchema = z.object({
  userId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    role: z.enum(['admin', 'premium', 'starter']).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    country: z.string().optional()
  })
});

export const updateUserProcedure = publicProcedure
  .input(updateUserSchema)
  .mutation(async ({ input }) => {
    const { userId, updates } = input;
    const db = getDatabase();
    
    try {
      // Check if user exists
      const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUser | undefined;
      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(updates.role);
      }
      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(updates.status);
      }
      if (updates.company !== undefined) {
        updateFields.push('company = ?');
        updateValues.push(updates.company);
      }
      if (updates.position !== undefined) {
        updateFields.push('position = ?');
        updateValues.push(updates.position);
      }
      if (updates.country !== undefined) {
        updateFields.push('country = ?');
        updateValues.push(updates.country);
      }
      
      if (updateFields.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No valid updates provided'
        });
      }
      
      updateValues.push(userId);
      
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      db.prepare(updateQuery).run(...updateValues);
      
      // Get updated user
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUser;
      
      // Add log entry
      db.prepare(`
        INSERT INTO system_logs (id, type, message, timestamp, user)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Date.now().toString(),
        'info',
        `User ${existingUser.name} (${existingUser.email}) updated by admin`,
        new Date().toISOString(),
        'admin'
      );
      
      return { success: true, user: dbUserToUser(updatedUser) };
      
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Update user error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user'
      });
    }
  });