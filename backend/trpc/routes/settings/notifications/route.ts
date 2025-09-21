import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { getDatabase, DbNotification, dbNotificationToNotification } from '@/backend/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const getNotificationsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const db = getDatabase();
    
    // Get user-specific and system-wide notifications
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id IS NULL 
      ORDER BY created_at DESC
    `).all(ctx.user.id) as DbNotification[];
    
    return notifications.map(dbNotificationToNotification);
  });

export const markNotificationReadProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const db = getDatabase();
    
    db.prepare(`
      UPDATE notifications 
      SET read = 1 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).run(input.id, ctx.user.id);
    
    return { success: true };
  });

export const deleteNotificationProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const db = getDatabase();
    
    db.prepare(`
      DELETE FROM notifications 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).run(input.id, ctx.user.id);
    
    return { success: true };
  });

export const clearNotificationsProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    const db = getDatabase();
    
    db.prepare(`
      DELETE FROM notifications 
      WHERE user_id = ? OR user_id IS NULL
    `).run(ctx.user.id);
    
    return { success: true };
  });

export const createNotificationProcedure = protectedProcedure
  .input(z.object({
    title: z.string(),
    message: z.string(),
    type: z.enum(['info', 'warning', 'error', 'success']),
    userId: z.string().optional() // If not provided, it's a system-wide notification
  }))
  .mutation(async ({ input }) => {
    const db = getDatabase();
    
    const notification: DbNotification = {
      id: uuidv4(),
      user_id: input.userId || null,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
      created_at: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      notification.id,
      notification.user_id,
      notification.title,
      notification.message,
      notification.type,
      notification.read,
      notification.created_at
    );
    
    return dbNotificationToNotification(notification);
  });