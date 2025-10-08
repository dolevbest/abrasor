import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { getDatabase, DbUserSettings, dbUserSettingsToUserSettings } from '@/backend/db/mysql_schema';

export const getUserSettingsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const db = getDatabase();
    
    const settings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(ctx.user.id) as DbUserSettings | undefined;
    
    if (!settings) {
      // Create default settings for user
      const defaultSettings: DbUserSettings = {
        user_id: ctx.user.id,
        unit_preference: ctx.user.unitPreference,
        theme_preference: ctx.user.themePreference || 'system',
        colorblind_mode: ctx.user.colorblindMode || 'none',
        font_size: ctx.user.fontSize || 'medium',
        notifications_enabled: true,
        updated_at: new Date().toISOString()
      };
      
      db.prepare(`
        INSERT INTO user_settings (user_id, unit_preference, theme_preference, colorblind_mode, font_size, notifications_enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        defaultSettings.user_id,
        defaultSettings.unit_preference,
        defaultSettings.theme_preference,
        defaultSettings.colorblind_mode,
        defaultSettings.font_size,
        defaultSettings.notifications_enabled,
        defaultSettings.updated_at
      );
      
      return dbUserSettingsToUserSettings(defaultSettings);
    }
    
    return dbUserSettingsToUserSettings(settings);
  });

export const updateUserSettingsProcedure = protectedProcedure
  .input(z.object({
    unitPreference: z.enum(['metric', 'imperial']).optional(),
    themePreference: z.enum(['light', 'dark', 'system']).optional(),
    colorblindMode: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
    fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
    notificationsEnabled: z.boolean().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    const db = getDatabase();
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    if (input.unitPreference !== undefined) {
      updates.push('unit_preference = ?');
      values.push(input.unitPreference);
    }
    if (input.themePreference !== undefined) {
      updates.push('theme_preference = ?');
      values.push(input.themePreference);
    }
    if (input.colorblindMode !== undefined) {
      updates.push('colorblind_mode = ?');
      values.push(input.colorblindMode);
    }
    if (input.fontSize !== undefined) {
      updates.push('font_size = ?');
      values.push(input.fontSize);
    }
    if (input.notificationsEnabled !== undefined) {
      updates.push('notifications_enabled = ?');
      values.push(input.notificationsEnabled);
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(ctx.user.id);
    
    if (updates.length > 1) { // More than just updated_at
      db.prepare(`
        UPDATE user_settings 
        SET ${updates.join(', ')} 
        WHERE user_id = ?
      `).run(...values);
    }
    
    // Also update user table if unit preference changed
    if (input.unitPreference !== undefined) {
      db.prepare(`
        UPDATE users 
        SET unit_preference = ? 
        WHERE id = ?
      `).run(input.unitPreference, ctx.user.id);
    }
    
    // Get updated settings
    const updatedSettings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(ctx.user.id) as DbUserSettings;
    
    return dbUserSettingsToUserSettings(updatedSettings);
  });