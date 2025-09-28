import mysql from 'mysql2/promise';
import { User, AccessRequest, UserRole, UserStatus, UnitSystem, Calculator } from '@/types';
import { SavedCalculation } from '@/hooks/calculations-context';
import { calculators as defaultCalculators } from '@/utils/calculators';

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
    
    // Create tables
    await createTables();
    
    // Insert default admin user if not exists
    await insertDefaultAdmin();
    
    // Initialize default calculators if none exist
    await initializeDefaultCalculators();
    
    return connection;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    throw error;
  }
}

async function createTables() {
  const tables = [
    // Users table
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

    // Access requests table
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

    // Calculators table
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

    // Saved calculations table
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

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('info', 'warning', 'error', 'success') NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // User settings table
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

    // Visitor sessions table
    `CREATE TABLE IF NOT EXISTS visitor_sessions (
      id VARCHAR(255) PRIMARY KEY,
      calculation_count INT NOT NULL DEFAULT 0,
      max_calculations INT NOT NULL DEFAULT 50,
      created_at DATETIME NOT NULL,
      last_activity DATETIME NOT NULL
    )`,

    // Visitor calculations table
    `CREATE TABLE IF NOT EXISTS visitor_calculations (
      id VARCHAR(255) PRIMARY KEY,
      visitor_id VARCHAR(255) NOT NULL,
      calculator_type VARCHAR(255) NOT NULL,
      inputs JSON NOT NULL,
      results JSON NOT NULL,
      unit_system ENUM('metric', 'imperial') NOT NULL,
      timestamp DATETIME NOT NULL
    )`,

    // System logs table
    `CREATE TABLE IF NOT EXISTS system_logs (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      user VARCHAR(255) NOT NULL
    )`,

    // Settings table
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
      'Do123456$', // In production, hash this password
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

// Helper functions remain similar but adapted for MySQL
export function dbUserToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    status: dbUser.status,
    unitPreference: dbUser.unit_preference,
    themePreference: dbUser.theme_preference,
    colorblindMode: dbUser.colorblind_mode,
    fontSize: dbUser.font_size,
    company: dbUser.company,
    position: dbUser.position,
    country: dbUser.country,
    profileImage: dbUser.profile_image,
    createdAt: new Date(dbUser.created_at),
    lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : undefined
  };
}

// Add other helper functions as needed...
