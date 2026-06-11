import { NextResponse } from 'next/server';

/**
 * Validates the Origin header on state-changing requests (POST, PUT, DELETE)
 * to prevent Cross-Site Request Forgery attacks.
 *
 * Returns null if valid, or a NextResponse with 403 if the origin is suspicious.
 */
export function validateCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // In production, verify origin matches our host
  if (process.env.NODE_ENV === 'production') {
    const host = request.headers.get('host');
    if (!host) {
      return NextResponse.json({ error: 'Missing host header' }, { status: 403 });
    }

    const allowedOrigin = `https://${host}`;

    // Check Origin header first (most reliable)
    if (origin && origin !== allowedOrigin) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    // If no Origin, check Referer as fallback
    if (!origin && referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== host) {
          return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
      }
    }
  }

  return null; // Validation passed
}
