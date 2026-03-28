import mysql from 'mysql2/promise';

// Manually load .env file
import * as fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf-8');
console.log('📄 .env file content:');
console.log(envContent);
console.log('---');

// Parse it manually
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('🔍 Parsed environment variables:');
console.log('Host:', envVars.DB_HOST);
console.log('Port:', envVars.DB_PORT);
console.log('User:', envVars.DB_USER);
console.log('Database:', envVars.DB_NAME);
console.log('---');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: envVars.DB_HOST || 'abrasor.com',
      port: parseInt(envVars.DB_PORT || '3306'),
      user: envVars.DB_USER || 'dolevbest_abrasor',
      password: envVars.DB_PASSWORD || '',
      database: envVars.DB_NAME || '',
      connectTimeout: 10000
    });
    
    console.log('✅ Connection successful!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);
    
    await connection.end();
    console.log('✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();