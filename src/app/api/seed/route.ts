import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { AdminUser } from '@/models/AdminUser';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const ADMIN_USERNAME = 'admin';
    const HASHED_PASSWORD = '$2b$12$eOlz/xeqQLV5DVFSgnZ5nOUZUjya8Uzpiu3lfFgieXpC80ZVVtq5u'; // Generated securely from your local machine

    const existing = await AdminUser.findOne({ username: ADMIN_USERNAME });
    
    if (existing) {
      existing.passwordHash = HASHED_PASSWORD;
      await existing.save();
      return NextResponse.json({ success: true, message: `✅ Password updated successfully for '${ADMIN_USERNAME}'!` });
    } else {
      await AdminUser.create({ username: ADMIN_USERNAME, passwordHash: HASHED_PASSWORD });
      return NextResponse.json({ success: true, message: `✅ Admin user '${ADMIN_USERNAME}' created successfully!` });
    }
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
