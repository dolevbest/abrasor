import Database from 'better-sqlite3';
import { User, AccessRequest, UserRole, UserStatus, UnitSystem, Calculator } from '@/types';
import { SavedCalculation } from '@/hooks/calculations-context';

// Database schema interfaces
export interface DbUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  unit_preference: UnitSystem;
  theme_preference?: string;
  colorblind_mode?: string;
  font_size?: string;
  company?: string;
  position?: string;
  country?: string;
  profile_image?: string;
  created_at: string;
  last_login?: string;
}

export interface DbAccessRequest {
  id: string;
  email: string;
  name: string;
  password: string;
  company: string;
  position: string;
  country: string;
  preferred_units: UnitSystem;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  request_date: string;
}

export interface DbSystemLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user: string;
}

export interface DbLoginAttempt {
  id: string;
  email: string;
  attempts: number;
  last_attempt: string;
  locked_until?: string;
}

export interface DbEmailRecord {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  type: string;
  sent_at: string;
  status: string;
}

export interface DbCalculator {
  id: string;
  name: string;
  short_name: string;
  description: string;
  categories: string; // JSON array
  inputs: string; // JSON array
  formula: string; // JSON object
  result_unit_metric: string;
  result_unit_imperial: string;
  enabled: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbSavedCalculation {
  id: string;
  user_id: string;
  calculator_id: string;
  calculator_name: string;
  calculator_short_name: string;
  inputs: string; // JSON object
  result: string; // JSON object
  unit_system: string;
  notes?: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id?: string; // null for system-wide notifications
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface DbUserSettings {
  user_id: string;
  unit_preference: string;
  theme_preference?: string;
  colorblind_mode?: string;
  font_size?: string;
  notifications_enabled: boolean;
  updated_at: string;
}

export interface DbVisitorCalculation {
  id: string;
  visitor_id: string;
  calculator_type: string;
  inputs: string; // JSON object
  results: string; // JSON object
  unit_system: string;
  timestamp: string;
}

export interface DbVisitorSession {
  id: string;
  calculation_count: number;
  max_calculations: number;
  created_at: string;
  last_activity: string;
}

// Initialize database
let db: Database.Database;

export function initDatabase() {
  if (db) return db;
  
  db = new Database('cgwise.db');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  createTables();
  
  // Insert default admin user if not exists
  insertDefaultAdmin();
  
  return db;
}

function createTables() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'premium', 'starter')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
      unit_preference TEXT NOT NULL CHECK (unit_preference IN ('metric', 'imperial')),
      theme_preference TEXT CHECK (theme_preference IN ('light', 'dark', 'system')),
      colorblind_mode TEXT CHECK (colorblind_mode IN ('none', 'protanopia', 'deuteranopia', 'tritanopia')),
      font_size TEXT CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
      company TEXT,
      position TEXT,
      country TEXT,
      profile_image TEXT,
      created_at TEXT NOT NULL,
      last_login TEXT
    )
  `);
  
  // Access requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      country TEXT NOT NULL,
      preferred_units TEXT NOT NULL CHECK (preferred_units IN ('metric', 'imperial')),
      role TEXT NOT NULL CHECK (role IN ('admin', 'premium', 'starter')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL,
      request_date TEXT NOT NULL
    )
  `);
  
  // System logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      user TEXT NOT NULL
    )
  `);
  
  // Login attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt TEXT NOT NULL,
      locked_until TEXT
    )
  `);
  
  // Email records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_records (
      id TEXT PRIMARY KEY,
      from_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);
  
  // Settings table for admin configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  // Calculators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      description TEXT,
      categories TEXT NOT NULL,
      inputs TEXT NOT NULL,
      formula TEXT NOT NULL,
      result_unit_metric TEXT,
      result_unit_imperial TEXT,
      enabled BOOLEAN NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  // Saved calculations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_calculations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      calculator_id TEXT NOT NULL,
      calculator_name TEXT NOT NULL,
      calculator_short_name TEXT NOT NULL,
      inputs TEXT NOT NULL,
      result TEXT NOT NULL,
      unit_system TEXT NOT NULL CHECK (unit_system IN ('metric', 'imperial')),
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);
  
  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
      read BOOLEAN NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);
  
  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      unit_preference TEXT NOT NULL CHECK (unit_preference IN ('metric', 'imperial')),
      theme_preference TEXT CHECK (theme_preference IN ('light', 'dark', 'system')),
      colorblind_mode TEXT CHECK (colorblind_mode IN ('none', 'protanopia', 'deuteranopia', 'tritanopia')),
      font_size TEXT CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
      notifications_enabled BOOLEAN NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);
  
  // Visitor calculations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_calculations (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      calculator_type TEXT NOT NULL,
      inputs TEXT NOT NULL,
      results TEXT NOT NULL,
      unit_system TEXT NOT NULL CHECK (unit_system IN ('metric', 'imperial')),
      timestamp TEXT NOT NULL
    )
  `);
  
  // Visitor sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id TEXT PRIMARY KEY,
      calculation_count INTEGER NOT NULL DEFAULT 0,
      max_calculations INTEGER NOT NULL DEFAULT 50,
      created_at TEXT NOT NULL,
      last_activity TEXT NOT NULL
    )
  `);
}

function insertDefaultAdmin() {
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('dolevb@cgwheels.com');
  
  if (!adminExists) {
    const adminUser: DbUser = {
      id: 'admin-1',
      email: 'dolevb@cgwheels.com',
      name: 'Dolev B',
      password: 'Do123456$$', // In production, this should be hashed
      role: 'admin',
      status: 'approved',
      unit_preference: 'metric',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO users (
        id, email, name, password, role, status, unit_preference, created_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminUser.id,
      adminUser.email,
      adminUser.name,
      adminUser.password,
      adminUser.role,
      adminUser.status,
      adminUser.unit_preference,
      adminUser.created_at,
      adminUser.last_login
    );
    
    console.log('✅ Default admin user created');
  }
  
  // Insert default settings
  const defaultSettings = [
    { key: 'maxLoginAttempts', value: '5' },
    { key: 'maintenanceMode', value: 'false' },
    { key: 'guestModeEnabled', value: 'true' },
    { key: 'maxGuestCalculations', value: '50' }
  ];
  
  for (const setting of defaultSettings) {
    const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(setting.key);
    if (!exists) {
      db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
        setting.key,
        setting.value,
        new Date().toISOString()
      );
    }
  }
  
  // Insert default notifications
  const welcomeNotificationExists = db.prepare('SELECT id FROM notifications WHERE id = ?').get('welcome-1');
  if (!welcomeNotificationExists) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'welcome-1',
      null, // System-wide notification
      'Welcome to CGWise',
      'Start exploring our grinding calculators',
      'info',
      false,
      new Date().toISOString()
    );
  }
}

export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Helper functions to convert between DB and App types
export function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    status: dbUser.status,
    unitPreference: dbUser.unit_preference,
    themePreference: dbUser.theme_preference as any,
    colorblindMode: dbUser.colorblind_mode as any,
    fontSize: dbUser.font_size as any,
    company: dbUser.company,
    position: dbUser.position,
    country: dbUser.country,
    profileImage: dbUser.profile_image,
    createdAt: new Date(dbUser.created_at),
    lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : undefined
  };
}

export function userToDbUser(user: User, password?: string): DbUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    password: password || '', // Password should be provided separately
    role: user.role,
    status: user.status,
    unit_preference: user.unitPreference,
    theme_preference: user.themePreference,
    colorblind_mode: user.colorblindMode,
    font_size: user.fontSize,
    company: user.company,
    position: user.position,
    country: user.country,
    profile_image: user.profileImage || undefined,
    created_at: user.createdAt.toISOString(),
    last_login: user.lastLogin?.toISOString()
  };
}

export function dbAccessRequestToAccessRequest(dbRequest: DbAccessRequest): AccessRequest {
  return {
    id: dbRequest.id,
    email: dbRequest.email,
    name: dbRequest.name,
    password: dbRequest.password,
    company: dbRequest.company,
    position: dbRequest.position,
    country: dbRequest.country,
    preferredUnits: dbRequest.preferred_units,
    role: dbRequest.role,
    status: dbRequest.status,
    createdAt: new Date(dbRequest.created_at),
    requestDate: new Date(dbRequest.request_date)
  };
}

export function dbCalculatorToCalculator(dbCalc: DbCalculator): Omit<Calculator, 'calculate'> {
  let categories: string[] = [];
  let inputs: any[] = [];
  
  try {
    if (dbCalc.categories) {
      categories = typeof dbCalc.categories === 'string' ? JSON.parse(dbCalc.categories) : dbCalc.categories;
    }
  } catch (error) {
    console.error('Failed to parse categories for calculator', dbCalc.id, ':', error);
    console.error('Categories data:', dbCalc.categories);
    categories = [];
  }
  
  try {
    if (dbCalc.inputs) {
      inputs = typeof dbCalc.inputs === 'string' ? JSON.parse(dbCalc.inputs) : dbCalc.inputs;
    }
  } catch (error) {
    console.error('Failed to parse inputs for calculator', dbCalc.id, ':', error);
    console.error('Inputs data:', dbCalc.inputs);
    inputs = [];
  }
  
  return {
    id: dbCalc.id,
    name: dbCalc.name,
    shortName: dbCalc.short_name,
    description: dbCalc.description || '',
    categories,
    inputs
  };
}

export function calculatorToDbCalculator(calc: Omit<Calculator, 'calculate'>, formula: any): DbCalculator {
  return {
    id: calc.id,
    name: calc.name,
    short_name: calc.shortName,
    description: calc.description || '',
    categories: JSON.stringify(calc.categories || []),
    inputs: JSON.stringify(calc.inputs || []),
    formula: JSON.stringify(formula || { type: 'function', value: 'calculate' }),
    result_unit_metric: '',
    result_unit_imperial: '',
    enabled: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function dbSavedCalculationToSavedCalculation(dbCalc: DbSavedCalculation): SavedCalculation {
  let inputs: any = {};
  let result: any = {};
  
  try {
    inputs = typeof dbCalc.inputs === 'string' ? JSON.parse(dbCalc.inputs) : dbCalc.inputs;
  } catch (error) {
    console.error('Failed to parse inputs for saved calculation', dbCalc.id, ':', error);
    inputs = {};
  }
  
  try {
    result = typeof dbCalc.result === 'string' ? JSON.parse(dbCalc.result) : dbCalc.result;
  } catch (error) {
    console.error('Failed to parse result for saved calculation', dbCalc.id, ':', error);
    result = {};
  }
  
  return {
    id: dbCalc.id,
    calculatorId: dbCalc.calculator_id,
    calculatorName: dbCalc.calculator_name,
    calculatorShortName: dbCalc.calculator_short_name,
    inputs,
    result,
    unitSystem: dbCalc.unit_system as UnitSystem,
    notes: dbCalc.notes,
    savedAt: new Date(dbCalc.created_at)
  };
}

export function savedCalculationToDbSavedCalculation(calc: SavedCalculation, userId: string): DbSavedCalculation {
  return {
    id: calc.id,
    user_id: userId,
    calculator_id: calc.calculatorId,
    calculator_name: calc.calculatorName,
    calculator_short_name: calc.calculatorShortName,
    inputs: JSON.stringify(calc.inputs),
    result: JSON.stringify(calc.result),
    unit_system: calc.unitSystem,
    notes: calc.notes,
    created_at: calc.savedAt.toISOString()
  };
}

export function dbNotificationToNotification(dbNotification: DbNotification) {
  return {
    id: dbNotification.id,
    title: dbNotification.title,
    message: dbNotification.message,
    type: dbNotification.type as 'info' | 'warning' | 'error' | 'success',
    read: Boolean(dbNotification.read),
    createdAt: new Date(dbNotification.created_at)
  };
}

export function dbUserSettingsToUserSettings(dbSettings: DbUserSettings) {
  return {
    userId: dbSettings.user_id,
    unitPreference: dbSettings.unit_preference as UnitSystem,
    themePreference: dbSettings.theme_preference as 'light' | 'dark' | 'system' | undefined,
    colorblindMode: dbSettings.colorblind_mode as 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | undefined,
    fontSize: dbSettings.font_size as 'small' | 'medium' | 'large' | 'extra-large' | undefined,
    notificationsEnabled: Boolean(dbSettings.notifications_enabled),
    updatedAt: new Date(dbSettings.updated_at)
  };
}

export function dbVisitorCalculationToVisitorCalculation(dbCalc: DbVisitorCalculation) {
  let inputs: any = {};
  let results: any = {};
  
  try {
    inputs = typeof dbCalc.inputs === 'string' ? JSON.parse(dbCalc.inputs) : dbCalc.inputs;
  } catch (error) {
    console.error('Failed to parse inputs for visitor calculation', dbCalc.id, ':', error);
    inputs = {};
  }
  
  try {
    results = typeof dbCalc.results === 'string' ? JSON.parse(dbCalc.results) : dbCalc.results;
  } catch (error) {
    console.error('Failed to parse results for visitor calculation', dbCalc.id, ':', error);
    results = {};
  }
  
  return {
    id: dbCalc.id,
    visitorId: dbCalc.visitor_id,
    calculatorType: dbCalc.calculator_type,
    inputs,
    results,
    unitSystem: dbCalc.unit_system as UnitSystem,
    timestamp: new Date(dbCalc.timestamp)
  };
}

export function dbVisitorSessionToVisitorSession(dbSession: DbVisitorSession) {
  return {
    id: dbSession.id,
    calculationCount: dbSession.calculation_count,
    maxCalculations: dbSession.max_calculations,
    createdAt: new Date(dbSession.created_at),
    lastActivity: new Date(dbSession.last_activity)
  };
}