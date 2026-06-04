import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
  // We only want to refresh tokens for authenticated admin routes
  // Let's check if there is an admin token present
  const token = request.cookies.get('admin_token')?.value;

  // If no token exists, just proceed normally (unauthenticated)
  if (!token) {
    return NextResponse.next();
  }

  try {
    // 1. Verify the existing token
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // 2. If valid, generate a brand new token to reset the expiration clock (Sliding Session)
    const freshToken = await new SignJWT({ username: verified.payload.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h') // Refreshes to 24 hours from right now
      .sign(new TextEncoder().encode(JWT_SECRET));

    // 3. Create a response and append the refreshed cookie
    const response = NextResponse.next();
    
    response.cookies.set({
      name: 'admin_token',
      value: freshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err) {
    // If the token is expired or invalid, we delete it and proceed
    const response = NextResponse.next();
    response.cookies.delete('admin_token');
    return response;
  }
}

// See "Matching Paths" below to learn more
export const config = {
  // Match all requests to the admin panel and the gallery API
  matcher: [
    '/admin/:path*',
    '/api/gallery/:path*'
  ],
};
