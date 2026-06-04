import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import connectToDatabase from '@/lib/mongodb';
import { AdminUser } from '@/models/AdminUser';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

export async function POST(request: Request) {
  try {
    const { password, username = 'admin' } = await request.json();
    
    await connectToDatabase();

    // Check if any admin exists. If not, create one using the provided password.
    // This is useful for first-time setup.
    const adminCount = await AdminUser.countDocuments();
    if (adminCount === 0) {
      if (!password || password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters for first-time setup.' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await AdminUser.create({ username, passwordHash: hashedPassword });
    }

    // Verify credentials
    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const token = await new SignJWT({ username: admin.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Create response and set HTTP-only cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'admin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
