import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// Note: middleware runs on the Edge runtime, so we cannot import from lib/auth.ts
// (which uses Node.js-only `cookies()` from next/headers). We duplicate the
// minimal secret retrieval here intentionally.
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // In middleware, we can't throw at module level (breaks cold start).
    // Return empty key — verification will fail, which is safe (denies access).
    return new TextEncoder().encode('');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET_KEY = getJwtSecret();
const JWT_COOKIE_NAME = 'admin_token';
const JWT_EXPIRATION = '24h';
const JWT_MAX_AGE = 60 * 60 * 24;

/**
 * Next.js Middleware — Sliding Session for Admin JWT
 *
 * On every request to admin/gallery routes, if a valid JWT cookie exists,
 * it's refreshed with a new expiration (sliding window).
 * If the JWT is expired/invalid, the cookie is deleted.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

  // If no token exists, just proceed normally (unauthenticated)
  if (!token) {
    return NextResponse.next();
  }

  try {
    // 1. Verify the existing token
    const verified = await jwtVerify(token, JWT_SECRET_KEY);

    // 2. If valid, generate a brand new token to reset the expiration clock (Sliding Session)
    const freshToken = await new SignJWT({ username: verified.payload.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(JWT_EXPIRATION)
      .sign(JWT_SECRET_KEY);

    // 3. Create a response and append the refreshed cookie
    const response = NextResponse.next();
    
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: freshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_MAX_AGE,
    });

    return response;
  } catch {
    // If the token is expired or invalid, we delete it and proceed
    const response = NextResponse.next();
    response.cookies.delete(JWT_COOKIE_NAME);
    return response;
  }
}

// Match admin panel routes and gallery API routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/gallery/:path*'
  ],
};
