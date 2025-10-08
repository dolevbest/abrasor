import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { getDatabase, dbSavedCalculationToSavedCalculation, savedCalculationToDbSavedCalculation, DbSavedCalculation } from '@/backend/db/mysql_schema';
import { TRPCError } from '@trpc/server';

// Get user's saved calculations
export const getSavedCalculationsProcedure = protectedProcedure
  .query(({ ctx }) => {
    const db = getDatabase();
    
    try {
      const dbCalculations = db.prepare('SELECT * FROM saved_calculations WHERE user_id = ? ORDER BY created_at DESC').all(ctx.user.id) as DbSavedCalculation[];
      return dbCalculations.map(calc => dbSavedCalculationToSavedCalculation(calc));
    } catch (error) {
      console.error('Error fetching saved calculations:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch saved calculations'
      });
    }
  });

// Save a calculation
export const saveCalculationProcedure = protectedProcedure
  .input(z.object({
    calculatorId: z.string(),
    calculatorName: z.string(),
    calculatorShortName: z.string(),
    inputs: z.record(z.string(), z.number()),
    result: z.object({
      value: z.number().nullable(),
      unit: z.record(z.string(), z.string()),
      scale: z.object({
        min: z.number(),
        max: z.number(),
        optimal: z.object({
          min: z.number(),
          max: z.number()
        })
      }).optional()
    }),
    unitSystem: z.enum(['metric', 'imperial']),
    notes: z.string().optional()
  }))
  .mutation(({ input, ctx }) => {
    const db = getDatabase();
    
    try {
      const id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const savedCalculation = {
        id,
        calculatorId: input.calculatorId,
        calculatorName: input.calculatorName,
        calculatorShortName: input.calculatorShortName,
        inputs: input.inputs,
        result: input.result,
        unitSystem: input.unitSystem,
        notes: input.notes,
        savedAt: new Date()
      };
      
      const dbCalc = savedCalculationToDbSavedCalculation(savedCalculation, ctx.user.id);
      
      db.prepare(`
        INSERT INTO saved_calculations (
          id, user_id, calculator_id, calculator_name, calculator_short_name,
          inputs, result, unit_system, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        dbCalc.id,
        dbCalc.user_id,
        dbCalc.calculator_id,
        dbCalc.calculator_name,
        dbCalc.calculator_short_name,
        dbCalc.inputs,
        dbCalc.result,
        dbCalc.unit_system,
        dbCalc.notes,
        dbCalc.created_at
      );
      
      return { id, success: true };
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save calculation'
      });
    }
  });

// Delete a saved calculation
export const deleteCalculationProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ input, ctx }) => {
    const db = getDatabase();
    
    try {
      const result = db.prepare('DELETE FROM saved_calculations WHERE id = ? AND user_id = ?').run(input.id, ctx.user.id);
      
      if (result.changes === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Calculation not found or not owned by user'
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting calculation:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete calculation'
      });
    }
  });

// Clear all saved calculations for user
export const clearAllCalculationsProcedure = protectedProcedure
  .mutation(({ ctx }) => {
    const db = getDatabase();
    
    try {
      db.prepare('DELETE FROM saved_calculations WHERE user_id = ?').run(ctx.user.id);
      return { success: true };
    } catch (error) {
      console.error('Error clearing calculations:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear calculations'
      });
    }
  });

// Get calculations by date range
export const getCalculationsByDateProcedure = protectedProcedure
  .input(z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }))
  .query(({ input, ctx }) => {
    const db = getDatabase();
    
    try {
      let query = 'SELECT * FROM saved_calculations WHERE user_id = ?';
      const params: any[] = [ctx.user.id];
      
      if (input.startDate) {
        query += ' AND created_at >= ?';
        params.push(input.startDate);
      }
      
      if (input.endDate) {
        query += ' AND created_at <= ?';
        params.push(input.endDate);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const dbCalculations = db.prepare(query).all(...params) as DbSavedCalculation[];
      return dbCalculations.map(calc => dbSavedCalculationToSavedCalculation(calc));
    } catch (error) {
      console.error('Error fetching calculations by date:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch calculations'
      });
    }
  });