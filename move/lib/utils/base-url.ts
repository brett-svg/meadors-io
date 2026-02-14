/**
 * Derive the app's public base URL for QR code generation.
 *
 * Priority:
 *  1. APP_BASE_URL env var (explicit override — set this in Railway/Vercel)
 *  2. VERCEL_URL env var (set automatically by Vercel)
 *  3. Host header from the current request (works in any deployment)
 *  4. http://localhost:3000 (local dev fallback)
 *
 * Never use localhost in QR codes — they would be unscanneable outside dev.
 */
export function getBaseUrl(request?: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (request) {
    const host = request.headers.get("host");
    if (host) {
      const protocol =
        host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
      return `${protocol}://${host}`;
    }
  }

  return "http://localhost:3000";
}
