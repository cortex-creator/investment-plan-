import { prisma } from "@/lib/prisma";
import { neonAuth } from "@/lib/auth/server";

export async function auth() {
  const result = await neonAuth.getSession();
  const neonUser = result?.data?.user;

  if (!neonUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: neonUser.email.toLowerCase() },
    include: { role: true },
  });

  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      name: user.name || neonUser.name || null,
      email: user.email,
      image: user.image ?? neonUser.image ?? null,
      role: user.role.name,
    },
  };
}

export async function signOut() {
  return neonAuth.signOut();
}
