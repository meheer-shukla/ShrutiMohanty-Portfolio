/**
 * Admin Seed Script
 * 
 * Creates the initial admin user in MongoDB.
 * Run with: npx tsx scripts/seed-admin.ts
 * 
 * Required environment variables (reads from .env.local automatically):
 *   MONGODB_URI - MongoDB connection string
 *   ADMIN_PASSWORD - Password for the admin user (min 8 chars)
 *   ADMIN_USERNAME - (optional) Username, defaults to 'admin'
 */

import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load environment variables exactly like Next.js does
loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be set and at least 8 characters long.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  }));

  // Check if admin already exists
  const existing = await AdminUser.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    console.log(`⚠️  Admin user '${ADMIN_USERNAME}' already exists. Updating password...`);
    existing.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await existing.save();
    console.log(`✅ Password updated for '${ADMIN_USERNAME}'.`);
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await AdminUser.create({ username: ADMIN_USERNAME, passwordHash: hashedPassword });
    console.log(`✅ Admin user '${ADMIN_USERNAME}' created successfully.`);
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
