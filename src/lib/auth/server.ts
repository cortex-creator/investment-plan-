import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET;

if (!baseUrl) {
  throw new Error("NEON_AUTH_BASE_URL is not configured.");
}

if (!cookieSecret) {
  throw new Error("NEON_AUTH_COOKIE_SECRET or AUTH_SECRET is not configured.");
}

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});
