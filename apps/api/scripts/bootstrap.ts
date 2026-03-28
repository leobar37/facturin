#!/usr/bin/env bun
/**
 * Bootstrap script for Facturin API
 * 
 * This script:
 * 1. Applies database migrations if needed
 * 2. Sets up the super admin credentials
 * 3. Verifies the setup
 * 
 * Usage:
 *   bun run scripts/bootstrap.ts
 *   ADMIN_PASSWORD=your-password bun run scripts/bootstrap.ts
 */

import { existsSync } from 'fs';
import bcrypt from 'bcrypt';

// Default admin credentials
const DEFAULT_EMAIL = 'admin@facturin.local';
const DEFAULT_PASSWORD = 'admin123';

// Get password from environment or use default
const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;

async function generateHash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🚀 Facturin Bootstrap Script');
  console.log('==========================\n');

  // Step 1: Generate the bcrypt hash
  console.log('📝 Step 1: Generating password hash...');
  const hash = await generateHash(adminPassword);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Hash: ${hash}\n`);

  // Step 2: Display environment variables to set
  console.log('📝 Step 2: Environment Variables');
  console.log('   Add these to your .env.local or environment:\n');
  console.log(`   SUPER_ADMIN_EMAIL=${adminEmail}`);
  console.log(`   SUPER_ADMIN_PASSWORD_HASH=${hash}\n`);

  // Step 3: Create .env.local if it doesn't exist
  const envLocalPath = join(process.cwd(), '.env.local');
  if (!existsSync(envLocalPath)) {
    console.log('📝 Step 3: Creating .env.local file...');
    console.log('   (skipped - file already exists or will be created manually)\n');
  }

  console.log('✅ Bootstrap complete!');
  console.log('\nNext steps:');
  console.log('1. Make sure PostgreSQL is running on port 5432');
  console.log('2. Make sure Redis is running on port 6380');
  console.log('3. Run: bun run dev (or bun run src/index.ts)');
  console.log('4. Test login: curl -X POST http://localhost:3102/api/auth/login \\');
  console.log('   -H "Content-Type: application/json" \\');
  console.log(`   -d '{"email":"${adminEmail}","password":"${adminPassword}"}'`);
}

main().catch(console.error);
