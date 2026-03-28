import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';
import { getDatabase, DbVisitorCalculation, DbVisitorSession, dbVisitorCalculationToVisitorCalculation, dbVisitorSessionToVisitorSession } from '@/backend/db/mysql_schema';

const VisitorCalculationSchema = z.object({
  calculatorType: z.string(),
  inputs: z.record(z.any()),
  results: z.record(z.any()),
  unitSystem: z.enum(['metric', 'imperial'])
});

export const createVisitorSessionProcedure = publicProcedure
  .mutation(async () => {
    const db = getDatabase();
    const sessionId = `visitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const maxCalculationsSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('maxGuestCalculations') as { value: string } | undefined;
    const maxCalculations = maxCalculationsSetting ? parseInt(maxCalculationsSetting.value, 10) : 50;
    
    const session: DbVisitorSession = {
      id: sessionId,
      calculation_count: 0,
      max_calculations: maxCalculations,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO visitor_sessions (id, calculation_count, max_calculations, created_at, last_activity)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.calculation_count,
      session.max_calculations,
      session.created_at,
      session.last_activity
    );
    
    return dbVisitorSessionToVisitorSession(session);
  });

export const getVisitorSessionProcedure = publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input }) => {
    const db = getDatabase();
    
    const session = db.prepare('SELECT * FROM visitor_sessions WHERE id = ?').get(input.sessionId) as DbVisitorSession | undefined;
    
    if (!session) {
      throw new Error('Visitor session not found');
    }
    
    // Update last activity
    db.prepare('UPDATE visitor_sessions SET last_activity = ? WHERE id = ?').run(
      new Date().toISOString(),
      input.sessionId
    );
    
    return dbVisitorSessionToVisitorSession(session);
  });

export const saveVisitorCalculationProcedure = publicProcedure
  .input(z.object({
    sessionId: z.string(),
    calculation: VisitorCalculationSchema
  }))
  .mutation(async ({ input }) => {
    const db = getDatabase();
    
    // Get session and check limits
    const session = db.prepare('SELECT * FROM visitor_sessions WHERE id = ?').get(input.sessionId) as DbVisitorSession | undefined;
    
    if (!session) {
      throw new Error('Visitor session not found');
    }
    
    if (session.calculation_count >= session.max_calculations) {
      throw new Error(`Guest users are limited to ${session.max_calculations} calculations. Please create an account to continue.`);
    }
    
    const calculationId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const calculation: DbVisitorCalculation = {
      id: calculationId,
      visitor_id: input.sessionId,
      calculator_type: input.calculation.calculatorType,
      inputs: JSON.stringify(input.calculation.inputs),
      results: JSON.stringify(input.calculation.results),
      unit_system: input.calculation.unitSystem,
      timestamp: new Date().toISOString()
    };
    
    // Insert calculation
    db.prepare(`
      INSERT INTO visitor_calculations (id, visitor_id, calculator_type, inputs, results, unit_system, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      calculation.id,
      calculation.visitor_id,
      calculation.calculator_type,
      calculation.inputs,
      calculation.results,
      calculation.unit_system,
      calculation.timestamp
    );
    
    // Update session count
    db.prepare('UPDATE visitor_sessions SET calculation_count = calculation_count + 1, last_activity = ? WHERE id = ?').run(
      new Date().toISOString(),
      input.sessionId
    );
    
    return dbVisitorCalculationToVisitorCalculation(calculation);
  });

export const getVisitorCalculationsProcedure = publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input }) => {
    const db = getDatabase();
    
    const calculations = db.prepare(`
      SELECT * FROM visitor_calculations 
      WHERE visitor_id = ? 
      ORDER BY timestamp DESC
    `).all(input.sessionId) as DbVisitorCalculation[];
    
    return calculations.map(dbVisitorCalculationToVisitorCalculation);
  });

export const clearVisitorCalculationsProcedure = publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .mutation(async ({ input }) => {
    const db = getDatabase();
    
    // Delete all calculations for this visitor
    db.prepare('DELETE FROM visitor_calculations WHERE visitor_id = ?').run(input.sessionId);
    
    // Reset calculation count
    db.prepare('UPDATE visitor_sessions SET calculation_count = 0, last_activity = ? WHERE id = ?').run(
      new Date().toISOString(),
      input.sessionId
    );
    
    return { success: true };
  });

export const getVisitorSettingsProcedure = publicProcedure
  .query(async () => {
    const db = getDatabase();
    
    const guestModeEnabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('guestModeEnabled') as { value: string } | undefined;
    const maxCalculations = db.prepare('SELECT value FROM settings WHERE key = ?').get('maxGuestCalculations') as { value: string } | undefined;
    
    return {
      guestModeEnabled: guestModeEnabled?.value === 'true',
      maxCalculations: maxCalculations ? parseInt(maxCalculations.value, 10) : 50
    };
  });

export const cleanupOldVisitorSessionsProcedure = publicProcedure
  .mutation(async () => {
    const db = getDatabase();
    
    // Delete sessions older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // First delete calculations for old sessions
    db.prepare(`
      DELETE FROM visitor_calculations 
      WHERE visitor_id IN (
        SELECT id FROM visitor_sessions 
        WHERE last_activity < ?
      )
    `).run(sevenDaysAgo);
    
    // Then delete old sessions
    const result = db.prepare('DELETE FROM visitor_sessions WHERE last_activity < ?').run(sevenDaysAgo);
    
    return { deletedSessions: result.changes };
  });