import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  await requireAdmin();
  const [users, plans] = await Promise.all([
    prisma.user.count(),
    prisma.investmentPlan.count(),
  ]);
  return <div><h1 className="text-2xl font-semibold">Administration</h1><p className="mt-2 text-sm text-muted">Users: {users} · Plans: {plans}</p></div>;
}
