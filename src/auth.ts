import { prisma } from "@/lib/prisma";
import { neonAuth } from "@/lib/auth/server";

const AUTH_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_TIMEOUT_MS): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function auth() {
  const result = await withTimeout(neonAuth.getSession());
  const neonUser = result?.data?.user;

  if (!neonUser?.email) return null;

  const user = await withTimeout(
    prisma.user.findUnique({
      where: { email: neonUser.email.toLowerCase() },
      include: { role: true },
    })
  );

  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      name: user.name || neonUser.name || null,
      email: user.email,
      image: user.image ?? neonUser.image ?? null,
      role: user.role.name,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function signOut() {
  return neonAuth.signOut();
}
