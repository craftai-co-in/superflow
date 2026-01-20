import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure for India region hosting compliance
// Note: Database should be configured to use India region in Replit dashboard
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration for serverless environment
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit concurrent connections for serverless
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  maxUses: 7500, // Maximum uses per connection before renewal
  keepAlive: true
});

// Enhanced error handling for connection issues
pool.on('error', (err: any) => {
  console.error('🚨 PostgreSQL Pool Error:', err.message);
  console.error('Error Code:', err.code);
  
  // Log specific error types for debugging
  if (err.code === '57P01') {
    console.log('🔄 Connection terminated by administrator - will retry on next request');
  } else if (err.code === 'ECONNRESET') {
    console.log('🔄 Connection reset - will retry on next request');
  } else if (err.code === 'ENOTFOUND') {
    console.log('🔄 DNS lookup failed - will retry on next request');
  }
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected');
});

pool.on('acquire', () => {
  console.log('🔗 PostgreSQL client acquired from pool');
});

pool.on('remove', () => {
  console.log('🔓 PostgreSQL client removed from pool');
});

export const db = drizzle({ client: pool, schema });

// Database retry wrapper for handling connection issues
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ Database operation succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a connection-related error that we should retry
      const isRetryableError = 
        error.code === '57P01' ||  // terminating connection due to administrator command
        error.code === 'ECONNRESET' ||  // connection reset
        error.code === 'ENOTFOUND' ||   // DNS lookup failed
        error.code === 'ECONNREFUSED' || // connection refused
        error.message?.includes('Connection terminated') ||
        error.message?.includes('connection was closed') ||
        error.message?.includes('Connection lost');
      
      if (!isRetryableError || attempt === maxRetries) {
        console.error(`❌ Database operation failed after ${attempt} attempts:`, error.message);
        throw error;
      }
      
      console.log(`🔄 Database operation failed on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`);
      console.log(`   Error: ${error.message} (Code: ${error.code})`);
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError!;
}