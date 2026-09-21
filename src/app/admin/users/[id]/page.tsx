import { requireAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TransactionList } from "@/components/transactions/TransactionList";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdjustBalanceForm } from "./AdjustBalanceForm";
import { ToggleActiveButton } from "./ToggleActiveButton";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      portfolio: true,
      investments: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.role.name === "ADMIN" ? "brand" : "neutral"}>{user.role.name}</Badge>
          <Badge variant={user.isActive ? "success" : "danger"}>
            {user.isActive ? "Active" : "Disabled"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Cash balance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {user.portfolio ? formatCurrency(user.portfolio.cashBalance) : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Total deposited</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {user.portfolio ? formatCurrency(user.portfolio.totalDeposited) : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Active investments</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {user.investments.filter((i) => i.status === "ACTIVE").length}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adjust balance</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustBalanceForm userId={user.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Joined {formatDate(user.createdAt)}. Disabling an account prevents the user from
              logging in.
            </p>
            <ToggleActiveButton userId={user.id} isActive={user.isActive} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.investments.length === 0 ? (
            <p className="p-5 text-sm text-muted">No investments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Principal</th>
                    <th className="px-5 py-3 font-medium">Current value</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {user.investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{inv.plan.name}</td>
                      <td className="px-5 py-3 text-muted">{formatCurrency(inv.principal)}</td>
                      <td className="px-5 py-3 text-foreground">{formatCurrency(inv.currentValue)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={inv.status === "ACTIVE" ? "success" : "neutral"}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={user.transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
