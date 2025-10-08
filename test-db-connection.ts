import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testConnection() {
  console.log('🔍 Testing MySQL connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'abrasor.com',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'dolevbest_abrasor',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '',
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
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Remote MySQL access is likely blocked');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Username or password is incorrect');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Connection timed out - firewall or wrong host');
    }
  }
}

testConnection();
