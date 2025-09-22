import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '@/backend/trpc/create-context';
import { getDatabase, dbCalculatorToCalculator, calculatorToDbCalculator, DbCalculator } from '@/backend/db/schema';
import { calculators as defaultCalculators } from '@/utils/calculators';
import { TRPCError } from '@trpc/server';

// Get all calculators (public)
export const getCalculatorsProcedure = publicProcedure
  .query(() => {
    console.log('🔍 getCalculatorsProcedure called');
    const db = getDatabase();
    
    try {
      // First, let's check if there are any calculators at all
      console.log('📊 Querying calculators table...');
      const dbCalculators = db.prepare('SELECT * FROM calculators WHERE enabled = 1 ORDER BY usage_count DESC').all() as DbCalculator[];
      console.log('📊 Found', dbCalculators.length, 'enabled calculators in database');
      
      // If no calculators exist, initialize with defaults
      if (dbCalculators.length === 0) {
        console.log('⚠️ No calculators found in database, initializing with defaults...');
        const initialized = initializeDefaultCalculators(db);
        console.log('✅ Initialized', initialized.length, 'default calculators');
        return initialized;
      }
      
      // Try to convert existing calculators
      console.log('✅ Found', dbCalculators.length, 'calculators in database, attempting conversion...');
      const convertedCalculators: any[] = [];
      let corruptedCount = 0;
      
      for (const dbCalc of dbCalculators) {
        try {
          const converted = dbCalculatorToCalculator(dbCalc);
          console.log('✅ Successfully converted calculator:', dbCalc.id, dbCalc.name);
          convertedCalculators.push(converted);
        } catch (conversionError) {
          console.error('❌ Failed to convert calculator:', dbCalc.id, 'Error:', conversionError);
          console.log('🗑️ Marking calculator as corrupted:', dbCalc.id);
          corruptedCount++;
        }
      }
      
      console.log('📊 Conversion summary:', {
        total: dbCalculators.length,
        converted: convertedCalculators.length,
        corrupted: corruptedCount
      });
      
      // If all calculators are corrupted or we have no valid ones, reinitialize
      if (convertedCalculators.length === 0) {
        console.log('⚠️ All calculators are corrupted, reinitializing with defaults...');
        // Clear corrupted data and reinitialize
        db.prepare('DELETE FROM calculators').run();
        const reinitialized = initializeDefaultCalculators(db);
        console.log('✅ Reinitialized', reinitialized.length, 'default calculators');
        return reinitialized;
      }
      
      console.log('✅ Returning', convertedCalculators.length, 'valid calculators');
      return convertedCalculators;
      
    } catch (error) {
      console.error('❌ Critical error in getCalculatorsProcedure:', error);
      
      // As a last resort, return default calculators directly
      console.log('🔄 Returning default calculators as fallback...');
      return defaultCalculators;
    }
  });

// Helper function to initialize default calculators
function initializeDefaultCalculators(db: any) {
  console.log('📦 Initializing with default calculators, count:', defaultCalculators.length);
  
  try {
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO calculators (
        id, name, short_name, description, categories, inputs, formula,
        result_unit_metric, result_unit_imperial, enabled, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    let insertedCount = 0;
    
    for (const calc of defaultCalculators) {
      try {
        // Validate calculator data
        if (!calc || !calc.id?.trim() || calc.id.length > 100) {
          console.error('❌ Invalid calculator data:', calc?.id || 'unknown');
          continue;
        }
        
        const dbCalc = calculatorToDbCalculator(calc, { type: 'function', value: 'calculate' });
        console.log('➕ Inserting calculator:', calc.id, calc.name);
        insertStmt.run(
          dbCalc.id,
          dbCalc.name,
          dbCalc.short_name,
          dbCalc.description,
          dbCalc.categories,
          dbCalc.inputs,
          dbCalc.formula,
          dbCalc.result_unit_metric,
          dbCalc.result_unit_imperial,
          dbCalc.enabled ? 1 : 0,
          dbCalc.usage_count,
          now,
          now
        );
        insertedCount++;
      } catch (insertError) {
        console.error('❌ Failed to insert calculator:', calc?.id || 'unknown', insertError);
      }
    }
    
    console.log('✅ Inserted', insertedCount, 'calculators');
    
    // Verify insertion by querying the database
    const verifyQuery = db.prepare('SELECT COUNT(*) as count FROM calculators WHERE enabled = 1').get() as { count: number };
    console.log('🔍 Verification: Found', verifyQuery.count, 'enabled calculators in database');
    
    // Return the default calculators directly to avoid another DB round trip
    console.log('✅ Returning', defaultCalculators.length, 'default calculators');
    return defaultCalculators;
  } catch (error) {
    console.error('❌ Failed to initialize default calculators:', error);
    // Return default calculators even if DB insertion fails
    return defaultCalculators;
  }
}

// Get calculator by ID (public)
export const getCalculatorByIdProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(({ input }) => {
    const db = getDatabase();
    
    try {
      const dbCalculator = db.prepare('SELECT * FROM calculators WHERE id = ? AND enabled = 1').get(input.id) as DbCalculator | undefined;
      
      if (!dbCalculator) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Calculator not found'
        });
      }
      
      return dbCalculatorToCalculator(dbCalculator);
    } catch (error) {
      console.error('Error fetching calculator:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch calculator'
      });
    }
  });

// Track calculator usage (public)
export const trackUsageProcedure = publicProcedure
  .input(z.object({ calculatorId: z.string() }))
  .mutation(({ input }) => {
    const db = getDatabase();
    
    try {
      const result = db.prepare(`
        UPDATE calculators 
        SET usage_count = usage_count + 1, updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), input.calculatorId);
      
      if (result.changes === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Calculator not found'
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error tracking calculator usage:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to track usage'
      });
    }
  });

// Admin: Create calculator
export const createCalculatorProcedure = protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    description: z.string().optional(),
    categories: z.array(z.string()),
    inputs: z.array(z.object({
      label: z.string(),
      key: z.string(),
      unit: z.object({
        metric: z.string(),
        imperial: z.string()
      }),
      placeholder: z.object({
        metric: z.string(),
        imperial: z.string()
      }),
      tooltip: z.string(),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional()
    })),
    formula: z.any(),
    resultUnitMetric: z.string().optional(),
    resultUnitImperial: z.string().optional()
  }))
  .mutation(({ input, ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const db = getDatabase();
    
    try {
      const id = `calc_${Date.now()}`;
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO calculators (
          id, name, short_name, description, categories, inputs, formula,
          result_unit_metric, result_unit_imperial, enabled, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.name,
        input.shortName,
        input.description || '',
        JSON.stringify(input.categories),
        JSON.stringify(input.inputs),
        JSON.stringify(input.formula),
        input.resultUnitMetric || '',
        input.resultUnitImperial || '',
        1,
        0,
        now,
        now
      );
      
      return { id, success: true };
    } catch (error) {
      console.error('Error creating calculator:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create calculator'
      });
    }
  });

// Admin: Update calculator
export const updateCalculatorProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    shortName: z.string().min(1).optional(),
    description: z.string().optional(),
    categories: z.array(z.string()).optional(),
    inputs: z.array(z.object({
      label: z.string(),
      key: z.string(),
      unit: z.object({
        metric: z.string(),
        imperial: z.string()
      }),
      placeholder: z.object({
        metric: z.string(),
        imperial: z.string()
      }),
      tooltip: z.string(),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional()
    })).optional(),
    formula: z.any().optional(),
    resultUnitMetric: z.string().optional(),
    resultUnitImperial: z.string().optional(),
    enabled: z.boolean().optional()
  }))
  .mutation(({ input, ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const db = getDatabase();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      if (input.shortName !== undefined) {
        updates.push('short_name = ?');
        values.push(input.shortName);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
      }
      if (input.categories !== undefined) {
        updates.push('categories = ?');
        values.push(JSON.stringify(input.categories));
      }
      if (input.inputs !== undefined) {
        updates.push('inputs = ?');
        values.push(JSON.stringify(input.inputs));
      }
      if (input.formula !== undefined) {
        updates.push('formula = ?');
        values.push(JSON.stringify(input.formula));
      }
      if (input.resultUnitMetric !== undefined) {
        updates.push('result_unit_metric = ?');
        values.push(input.resultUnitMetric);
      }
      if (input.resultUnitImperial !== undefined) {
        updates.push('result_unit_imperial = ?');
        values.push(input.resultUnitImperial);
      }
      if (input.enabled !== undefined) {
        updates.push('enabled = ?');
        values.push(input.enabled ? 1 : 0);
      }
      
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(input.id);
      
      const result = db.prepare(`
        UPDATE calculators SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);
      
      if (result.changes === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Calculator not found'
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating calculator:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update calculator'
      });
    }
  });

// Admin: Delete calculator
export const deleteCalculatorProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ input, ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const db = getDatabase();
    
    try {
      const result = db.prepare('DELETE FROM calculators WHERE id = ?').run(input.id);
      
      if (result.changes === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Calculator not found'
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting calculator:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete calculator'
      });
    }
  });

// Admin: Get all calculators (including disabled)
export const getAllCalculatorsProcedure = protectedProcedure
  .query(({ ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const db = getDatabase();
    
    try {
      const dbCalculators = db.prepare('SELECT * FROM calculators ORDER BY created_at DESC').all() as DbCalculator[];
      return dbCalculators.map(calc => {
        // Validate calculator data
        if (!calc || !calc.id?.trim() || calc.id.length > 100) {
          throw new Error(`Invalid calculator data: ${calc?.id || 'unknown'}`);
        }
        
        // Additional validation for dbCalculatorToCalculator
        const sanitizedCalc = {
          ...calc,
          id: calc.id.trim(),
          name: calc.name?.trim() || '',
          short_name: calc.short_name?.trim() || ''
        };
        
        return {
          ...dbCalculatorToCalculator(sanitizedCalc),
          enabled: calc.enabled,
          usageCount: calc.usage_count,
          createdAt: new Date(calc.created_at),
          updatedAt: new Date(calc.updated_at)
        };
      });
    } catch (error) {
      console.error('Error fetching all calculators:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch calculators'
      });
    }
  });

// Admin: Reset calculators to defaults
export const resetCalculatorsProcedure = protectedProcedure
  .mutation(({ ctx }) => {
    if (ctx.user?.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }
    
    const db = getDatabase();
    
    try {
      // Clear existing calculators
      db.prepare('DELETE FROM calculators').run();
      console.log('Cleared existing calculators');
      
      // Insert default calculators
      const insertStmt = db.prepare(`
        INSERT INTO calculators (
          id, name, short_name, description, categories, inputs, formula,
          result_unit_metric, result_unit_imperial, enabled, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      let insertedCount = 0;
      
      for (const calc of defaultCalculators) {
        try {
          // Validate calculator data
          if (!calc || !calc.id?.trim() || calc.id.length > 100) {
            console.error('❌ Invalid calculator data during reset:', calc?.id || 'unknown');
            continue;
          }
          
          const dbCalc = calculatorToDbCalculator(calc, { type: 'function', value: 'calculate' });
          insertStmt.run(
            dbCalc.id,
            dbCalc.name,
            dbCalc.short_name,
            dbCalc.description,
            dbCalc.categories,
            dbCalc.inputs,
            dbCalc.formula,
            dbCalc.result_unit_metric,
            dbCalc.result_unit_imperial,
            dbCalc.enabled ? 1 : 0,
            dbCalc.usage_count,
            now,
            now
          );
          insertedCount++;
        } catch (insertError) {
          console.error('Failed to insert calculator during reset:', calc?.id || 'unknown', insertError);
        }
      }
      
      console.log('Reset complete. Inserted', insertedCount, 'calculators');
      return { success: true, count: insertedCount };
    } catch (error) {
      console.error('Error resetting calculators:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset calculators'
      });
    }
  });

// Public: Clear corrupted calculators and reinitialize
export const clearCorruptedCalculatorsProcedure = publicProcedure
  .mutation(() => {
    console.log('🧹 Clearing corrupted calculators...');
    const db = getDatabase();
    
    try {
      // More aggressive approach: clear all calculators and reinitialize
      console.log('🗑️ Clearing all existing calculators to fix corruption...');
      const deleteResult = db.prepare('DELETE FROM calculators').run();
      console.log('Deleted', deleteResult.changes, 'calculators');
      
      // Insert default calculators
      console.log('📦 Reinitializing with default calculators...');
      const insertStmt = db.prepare(`
        INSERT INTO calculators (
          id, name, short_name, description, categories, inputs, formula,
          result_unit_metric, result_unit_imperial, enabled, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      let insertedCount = 0;
      
      for (const calc of defaultCalculators) {
        try {
          // Validate calculator data
          if (!calc || !calc.id?.trim() || calc.id.length > 100) {
            console.error('❌ Invalid calculator data during cleanup:', calc?.id || 'unknown');
            continue;
          }
          
          const dbCalc = calculatorToDbCalculator(calc, { type: 'function', value: 'calculate' });
          console.log('➕ Inserting calculator:', calc.id, calc.name);
          insertStmt.run(
            dbCalc.id,
            dbCalc.name,
            dbCalc.short_name,
            dbCalc.description,
            dbCalc.categories,
            dbCalc.inputs,
            dbCalc.formula,
            dbCalc.result_unit_metric,
            dbCalc.result_unit_imperial,
            dbCalc.enabled ? 1 : 0,
            dbCalc.usage_count,
            now,
            now
          );
          insertedCount++;
        } catch (insertError) {
          console.error('❌ Failed to insert calculator during cleanup:', calc?.id || 'unknown', insertError);
        }
      }
      
      console.log('✅ Cleanup complete. Inserted', insertedCount, 'calculators');
      return { success: true, cleared: deleteResult.changes, inserted: insertedCount };
    } catch (error) {
      console.error('❌ Error clearing corrupted calculators:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear corrupted calculators'
      });
    }
  });