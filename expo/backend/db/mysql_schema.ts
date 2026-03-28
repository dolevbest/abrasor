import mysql from 'mysql2/promise';
import { User, AccessRequest, UserRole, UserStatus, UnitSystem, Calculator } from '@/types';
import { SavedCalculation } from '@/hooks/calculations-context';
import { calculators as defaultCalculators } from '@/utils/calculators';
import 'dotenv/config';

// Database interfaces
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

export interface DbCalculator {
  id: string;
  name: string;
  short_name: string;
  description: string;
  categories: string;
  inputs: string;
  formula: string;
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
  inputs: string;
  result: string;
  unit_system: string;
  notes?: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id?: string;
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
  inputs: string;
  results: string;
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

// Database connection
let connection: mysql.Connection;

export async function initDatabase() {
  if (connection) return connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'abrasor_db',
    });
    
    console.log('✅ MySQL connection established');
    
    await createTables();
    await insertDefaultAdmin();
    await initializeDefaultCalculators();
    
    return connection;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    throw error;
  }
}

async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'premium', 'starter') NOT NULL,
      status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL,
      unit_preference ENUM('metric', 'imperial') NOT NULL,
      theme_preference ENUM('light', 'dark', 'system') DEFAULT NULL,
      colorblind_mode ENUM('none', 'protanopia', 'deuteranopia', 'tritanopia') DEFAULT NULL,
      font_size ENUM('small', 'medium', 'large', 'extra-large') DEFAULT NULL,
      company VARCHAR(255) DEFAULT NULL,
      position VARCHAR(255) DEFAULT NULL,
      country VARCHAR(255) DEFAULT NULL,
      profile_image TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL,
      last_login DATETIME DEFAULT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS access_requests (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      country VARCHAR(255) NOT NULL,
      preferred_units ENUM('metric', 'imperial') NOT NULL,
      role ENUM('admin', 'premium', 'starter') NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL,
      created_at DATETIME NOT NULL,
      request_date DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS calculators (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(255) NOT NULL,
      description TEXT,
      categories JSON NOT NULL,
      inputs JSON NOT NULL,
      formula JSON NOT NULL,
      result_unit_metric VARCHAR(255),
      result_unit_imperial VARCHAR(255),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      usage_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS saved_calculations (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      calculator_id VARCHAR(255) NOT NULL,
      calculator_name VARCHAR(255) NOT NULL,
      calculator_short_name VARCHAR(255) NOT NULL,
      inputs JSON NOT NULL,
      result JSON NOT NULL,
      unit_system ENUM('metric', 'imperial') NOT NULL,
      notes TEXT,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('info', 'warning', 'error', 'success') NOT NULL,
      \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id VARCHAR(255) PRIMARY KEY,
      unit_preference ENUM('metric', 'imperial') NOT NULL,
      theme_preference ENUM('light', 'dark', 'system'),
      colorblind_mode ENUM('none', 'protanopia', 'deuteranopia', 'tritanopia'),
      font_size ENUM('small', 'medium', 'large', 'extra-large'),
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS visitor_sessions (
      id VARCHAR(255) PRIMARY KEY,
      calculation_count INT NOT NULL DEFAULT 0,
      max_calculations INT NOT NULL DEFAULT 50,
      created_at DATETIME NOT NULL,
      last_activity DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS visitor_calculations (
      id VARCHAR(255) PRIMARY KEY,
      visitor_id VARCHAR(255) NOT NULL,
      calculator_type VARCHAR(255) NOT NULL,
      inputs JSON NOT NULL,
      results JSON NOT NULL,
      unit_system ENUM('metric', 'imperial') NOT NULL,
      timestamp DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS system_logs (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      user VARCHAR(255) NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME NOT NULL
    )`
  ];

  for (const table of tables) {
    await connection.execute(table);
  }
  
  console.log('✅ MySQL tables created successfully');
}

async function insertDefaultAdmin() {
  const [rows] = await connection.execute(
    'SELECT id FROM users WHERE email = ?',
    ['dolevb@cgwheels.com']
  );
  
  if ((rows as any[]).length === 0) {
    await connection.execute(`
      INSERT INTO users (
        id, email, name, password, role, status, unit_preference, created_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'admin-1',
      'dolevb@cgwheels.com',
      'Dolev B',
      'Do123456$',
      'admin',
      'approved',
      'metric',
      new Date(),
      new Date()
    ]);
    
    console.log('✅ Default admin user created');
  }
}

async function initializeDefaultCalculators() {
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM calculators');
  const count = (rows as any[])[0].count;
  
  if (count === 0) {
    console.log('📦 Initializing default calculators...');
    
    for (const calc of defaultCalculators) {
      try {
        await connection.execute(`
          INSERT INTO calculators (
            id, name, short_name, description, categories, inputs, formula,
            result_unit_metric, result_unit_imperial, enabled, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          calc.id,
          calc.name,
          calc.shortName,
          calc.description || '',
          JSON.stringify(calc.categories || []),
          JSON.stringify(calc.inputs || []),
          JSON.stringify({ type: 'function', value: 'calculate' }),
          '',
          '',
          true,
          0,
          new Date(),
          new Date()
        ]);
      } catch (error) {
        console.error('❌ Failed to insert calculator:', calc.id, error);
      }
    }
    
    console.log('✅ Default calculators initialized');
  }
}

export function getDatabase() {
  if (!connection) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return connection;
}

// Helper functions
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
    password: password || '',
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

export function dbCalculatorToCalculator(dbCalc: DbCalculator): Calculator {
  let categories: string[] = [];
  let inputs: any[] = [];
  
  try {
    categories = typeof dbCalc.categories === 'string' 
      ? JSON.parse(dbCalc.categories) 
      : dbCalc.categories;
  } catch (error) {
    console.error('Failed to parse categories:', error);
    categories = [];
  }
  
  try {
    inputs = typeof dbCalc.inputs === 'string' 
      ? JSON.parse(dbCalc.inputs) 
      : dbCalc.inputs;
  } catch (error) {
    console.error('Failed to parse inputs:', error);
    inputs = [];
  }
  
  const defaultCalc = defaultCalculators.find(calc => calc.id === dbCalc.id);
  
  return {
    id: dbCalc.id,
    name: dbCalc.name,
    shortName: dbCalc.short_name,
    description: dbCalc.description || '',
    categories,
    inputs,
    calculate: defaultCalc?.calculate || (() => ({ 
      label: 'Result', 
      value: null, 
      unit: { metric: '', imperial: '' } 
    }))
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
    console.error('Failed to parse inputs:', error);
    inputs = {};
  }
  
  try {
    result = typeof dbCalc.result === 'string' ? JSON.parse(dbCalc.result) : dbCalc.result;
  } catch (error) {
    console.error('Failed to parse result:', error);
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
    console.error('Failed to parse inputs:', error);
    inputs = {};
  }
  
  try {
    results = typeof dbCalc.results === 'string' ? JSON.parse(dbCalc.results) : dbCalc.results;
  } catch (error) {
    console.error('Failed to parse results:', error);
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