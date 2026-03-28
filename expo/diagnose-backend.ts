#!/usr/bin/env node

// Diagnostic script to test backend connectivity
// Usage: tsx diagnose-backend.ts

import { testBackendConnection } from "./lib/trpc";

console.log("🔍 Diagnosing Backend Connection...");
console.log("=" .repeat(50));

async function runDiagnostics() {
  console.log("1. Testing backend connection...");
  
  try {
    const result = await testBackendConnection();
    
    if (result.success) {
      console.log("✅ Backend connection successful!");
      console.log("📝 Message:", result.message);
    } else {
      console.log("❌ Backend connection failed!");
      console.log("📝 Message:", result.message);
      console.log("");
      console.log("🔧 Troubleshooting steps:");
      console.log("1. Make sure the backend server is running:");
      console.log("   npm run start-backend");
      console.log("2. Check if port 3001 is available");
      console.log("3. Verify your network connection");
    }
  } catch (error) {
    console.error("❌ Diagnostic failed:", error);
  }
  
  console.log("");
  console.log("📊 Environment Information:");
  console.log("- Platform:", process.platform);
  console.log("- Node version:", process.version);
  console.log("- Working directory:", process.cwd());
  
  // Test if we can reach localhost:3001
  console.log("");
  console.log("2. Testing direct HTTP connection to localhost:3001...");
  
  try {
    const response = await fetch("http://localhost:3001/api/", {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Direct HTTP connection successful!");
      console.log("📝 Response:", data);
    } else {
      console.log("❌ Direct HTTP connection failed!");
      console.log("📝 Status:", response.status, response.statusText);
    }
  } catch (error) {
    console.log("❌ Direct HTTP connection failed!");
    console.log("📝 Error:", error.message);
    console.log("");
    console.log("💡 This likely means the backend server is not running.");
    console.log("   Start it with: npm run start-backend");
  }
}

runDiagnostics().catch(console.error);