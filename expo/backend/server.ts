import { serve } from '@hono/node-server';
import app from "./hono";

const port = process.env.PORT || 3001;

console.log(`🚀 Starting backend server on port ${port}...`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Working directory: ${process.cwd()}`);

try {
  const server = serve({
    fetch: app.fetch,
    port: Number(port),
    hostname: '0.0.0.0', // Listen on all interfaces
  });
  
  console.log(`✅ Backend server running on http://localhost:${port}`);
  console.log(`📡 API endpoints available at http://localhost:${port}/api`);
  console.log(`🔗 tRPC endpoints available at http://localhost:${port}/api/trpc`);
  console.log(`🌐 Server listening on all interfaces (0.0.0.0:${port})`);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start backend server:', error);
  process.exit(1);
}