import { requireAdmin } from "@/lib/authz";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    include: { role: true, portfolio: true, investments: { where: { status: "ACTIVE" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Active investments</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-5 py-3 text-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={u.role.name === "ADMIN" ? "brand" : "neutral"}>{u.role.name}</Badge>
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      {u.portfolio ? formatCurrency(u.portfolio.cashBalance) : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{u.investments.length}</td>
                    <td className="px-5 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/users/${u.id}`} className="text-brand hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
