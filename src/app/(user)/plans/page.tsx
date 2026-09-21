import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { bpsToPercentLabel, formatCurrency } from "@/lib/format";

const riskVariant: Record<string, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export default async function PlansPage() {
  const { requireUser } = await import("@/lib/authz");
  const { toNumber } = await import("@/lib/format");
  const user = await requireUser();

  const [plans, portfolio] = await Promise.all([
    prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: "asc" },
    }),
    prisma.portfolio.findUnique({ where: { userId: user.id } }),
  ]);

  const balance = portfolio ? toNumber(portfolio.cashBalance) : 0;
  const eligiblePlans = plans.filter((plan) => {
    const min = toNumber(plan.minAmount);
    const max = plan.maxAmount ? toNumber(plan.maxAmount) : Number.POSITIVE_INFINITY;
    return balance >= min && balance >= Math.min(min, max);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Investment Plans</h1>
        <p className="text-sm text-muted">Choose from the plans available for your current balance.</p>
        <p className="mt-2 text-sm font-medium text-foreground">Available balance: {formatCurrency(balance)}</p>
      </div>

      {eligiblePlans.length === 0 ? (
        <div className="rounded-lg border border-border p-6">
          <p className="font-medium text-foreground">No plan matches your current balance yet.</p>
          <p className="mt-1 text-sm text-muted">Increase your available balance to unlock more investment options.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eligiblePlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  <Badge variant={riskVariant[plan.riskLevel]}>{plan.riskLevel}</Badge>
                </div>
                <p className="flex-1 text-sm text-muted">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-brand">
                    {bpsToPercentLabel(plan.returnRateBps)}
                  </span>
                  <span className="text-xs text-muted">/ {plan.durationDays} days</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatCurrency(plan.minAmount)} min
                  {plan.maxAmount ? ` · ${formatCurrency(plan.maxAmount)} max` : ""}
                </p>
                <LinkButton href={`/plans/${plan.slug}`} className="mt-4">
                  View plan
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
