import { requireAdmin } from "@/lib/authz";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { bpsToPercentLabel, formatCurrency } from "@/lib/format";
import { PlanRowActions } from "./PlanRowActions";

const riskVariant: Record<string, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export default async function AdminPlansPage() {
  await requireAdmin();
  const plans = await prisma.investmentPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { investments: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Investment Plans</h1>
        <LinkButton href="/admin/plans/new" size="sm">
          New plan
        </LinkButton>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Min / Max</th>
                  <th className="px-5 py-3 font-medium">Investors</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <Link href={`/admin/plans/${plan.id}`} className="hover:underline">
                        {plan.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{bpsToPercentLabel(plan.returnRateBps)}</td>
                    <td className="px-5 py-3 text-muted">{plan.durationDays}d</td>
                    <td className="px-5 py-3">
                      <Badge variant={riskVariant[plan.riskLevel]}>{plan.riskLevel}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatCurrency(plan.minAmount)}
                      {plan.maxAmount ? ` / ${formatCurrency(plan.maxAmount)}` : " / —"}
                    </td>
                    <td className="px-5 py-3 text-muted">{plan._count.investments}</td>
                    <td className="px-5 py-3">
                      <Badge variant={plan.isActive ? "success" : "neutral"}>
                        {plan.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <PlanRowActions planId={plan.id} isActive={plan.isActive} />
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
