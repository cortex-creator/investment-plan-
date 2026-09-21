import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  "https://ep-super-tree-b5erkgh7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";

const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET;

export const auth = createNeonAuth({
  baseUrl,
  ...(cookieSecret
    ? {
        cookies: {
          secret: cookieSecret,
          sessionDataTtl: 300,
        },
      }
    : {}),
});

// Backward-compatible alias for existing server actions.
export const neonAuth = auth;
