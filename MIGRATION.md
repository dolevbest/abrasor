# Migration from Bun to Node.js

This project has been migrated from Bun to Node.js. Here are the key changes and how to use the new setup:

## Changes Made

1. **Server Runtime**: Replaced Bun's `serve` with `@hono/node-server`
2. **Package Scripts**: Updated all scripts to use `npx` instead of `bunx`
3. **Backend Execution**: Now uses `tsx` for TypeScript execution
4. **Dependencies**: Added `@hono/node-server`, `tsx`, and `@types/node`

## How to Run

### Frontend (Expo)
```bash
# Start the Expo development server
npm run start

# Start web version
npm run start-web

# Start web with debug logs
npm run start-web-dev
```

### Backend
```bash
# Start the backend server (recommended for development)
npm run start-backend

# Alternative: Build and run with Node.js
npm run build-backend
node start-backend.js
```

## Backend Server Details

- **Port**: 3001 (configurable via PORT environment variable)
- **API Base**: `http://localhost:3001/api`
- **tRPC Endpoint**: `http://localhost:3001/api/trpc`
- **Health Check**: `http://localhost:3001/api`

## Development Workflow

1. Start the backend server: `npm run start-backend`
2. In another terminal, start the frontend: `npm run start`
3. The frontend will connect to the backend automatically

## Troubleshooting

If you encounter connection issues:

1. Ensure the backend is running on port 3001
2. Check that no firewall is blocking the connection
3. Verify the API health check endpoint: `curl http://localhost:3001/api`

## Dependencies

The following Node.js-specific packages were added:
- `@hono/node-server`: Hono adapter for Node.js
- `tsx`: TypeScript execution engine for Node.js
- `@types/node`: Node.js type definitions