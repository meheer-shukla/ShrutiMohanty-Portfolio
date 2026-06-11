import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import { AdminUser } from '@/models/AdminUser';
import { createAdminToken, JWT_COOKIE_NAME, JWT_MAX_AGE } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { isRateLimited, resetRateLimit, getRateLimitResetSeconds } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // CSRF validation
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    // Rate limiting (use forwarded IP on Vercel, fallback to 'unknown')
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      const retryAfter = getRateLimitResetSeconds(ip);
      return NextResponse.json(
        { success: false, error: `Too many login attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { password, username = 'admin' } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify credentials against existing admin user
    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      // Generic error message to prevent username enumeration
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login — reset rate limit and issue token
    resetRateLimit(ip);

    const token = await createAdminToken(admin.username);

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_MAX_AGE,
    });

    return response;
  } catch (error: unknown) {
    console.error("Auth error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(JWT_COOKIE_NAME);
  return response;
}
