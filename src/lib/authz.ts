import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLE_ADMIN } from "@/lib/constants";

export async function getSession() {
  return auth();
}

/** Redirects to /login if not authenticated. Use in server components/actions for user-facing pages. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/** Redirects to /login (or /dashboard if logged in as a non-admin) — never trust middleware alone for admin gating. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== ROLE_ADMIN) {
    redirect("/dashboard");
  }
  if ((session.user as typeof session.user & { mustChangePassword?: boolean }).mustChangePassword) {
    redirect("/admin/change-password");
  }
  return session.user;
}
