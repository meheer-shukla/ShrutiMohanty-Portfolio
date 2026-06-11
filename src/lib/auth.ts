import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

/**
 * Centralized JWT secret. Throws at import-time if missing,
 * preventing the app from ever running with a guessable fallback.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Please define it in your .env.local file and in your Vercel project settings.'
    );
  }
  return new TextEncoder().encode(secret);
}

export const JWT_SECRET_KEY = getJwtSecret();
export const JWT_EXPIRATION = '24h';
export const JWT_COOKIE_NAME = 'admin_token';
export const JWT_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

/**
 * Verify the admin JWT from the request cookies.
 * Returns true only if the token is valid and has an admin role.
 */
export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;

  if (!token) return false;

  try {
    const verified = await jwtVerify(token, JWT_SECRET_KEY);
    return verified.payload?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Create a signed JWT for an admin user.
 */
export async function createAdminToken(username: string): Promise<string> {
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET_KEY);
}
