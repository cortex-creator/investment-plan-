import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { DepositActions } from "./DepositActions";

const typeLabel: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  INVESTMENT: "Investment",
  RETURN: "Return",
  ADJUSTMENT: "Adjustment",
};

const statusVariant: Record<string, "success" | "warning" | "danger"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "danger",
};

export default async function AdminTransactionsPage() {
  await requireAdmin();
  const [pendingDeposits, allTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "DEPOSIT", status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Transactions & Deposits</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending deposits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingDeposits.length === 0 ? (
            <p className="p-5 text-sm text-muted">No pending deposits.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingDeposits.map((tx) => (
                <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.user.name} ({tx.user.email})
                    </p>
                    <p className="text-xs text-muted">
                      {formatCurrency(tx.amount)} · {tx.reference} · {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <DepositActions transactionId={tx.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-foreground">{tx.user.email}</td>
                    <td className="px-5 py-3 text-muted">{typeLabel[tx.type] ?? tx.type}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant[tx.status]}>{tx.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-foreground">{formatCurrency(tx.amount)}</td>
                    <td className="px-5 py-3 text-muted">{formatDateTime(tx.createdAt)}</td>
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
