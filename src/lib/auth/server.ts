import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  "https://ep-super-tree-b5erkgh7.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";

const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET;

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!cookieSecret && !isProductionBuild) {
  throw new Error(
    "NEON_AUTH_COOKIE_SECRET or AUTH_SECRET must be configured for Neon Auth."
  );
}

// Next.js evaluates route modules during the production build. Keep the build
// independent of runtime-only secrets, while still failing fast at runtime
// when the required secret is actually missing.
const resolvedCookieSecret =
  cookieSecret || "build-only-neon-auth-cookie-secret-not-for-runtime";

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: resolvedCookieSecret,
    sessionDataTtl: 300,
  },
});
