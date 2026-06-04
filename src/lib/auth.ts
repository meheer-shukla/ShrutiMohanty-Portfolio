import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

export async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) return false;

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return verified.payload?.role === 'admin';
  } catch (err) {
    return false;
  }
}
