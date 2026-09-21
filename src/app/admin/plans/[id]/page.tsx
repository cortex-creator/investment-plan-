import { requireAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { updatePlanAction } from "@/lib/actions/admin-plans";
import { PlanForm, type PlanFormValues } from "../PlanForm";
import { toNumber } from "@/lib/format";

export default async function EditPlanPage({
  await requireAdmin(); params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.investmentPlan.findUnique({ where: { id } });
  if (!plan) notFound();

  const boundAction = updatePlanAction.bind(null, plan.id);

  const defaultValues: PlanFormValues = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    minAmount: toNumber(plan.minAmount),
    maxAmount: plan.maxAmount ? toNumber(plan.maxAmount) : null,
    returnRateBps: plan.returnRateBps,
    durationDays: plan.durationDays,
    riskLevel: plan.riskLevel,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Plan</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm action={boundAction} defaultValues={defaultValues} submitLabel="Save changes" />
        </CardContent>
      </Card>
    </div>
  );
}
