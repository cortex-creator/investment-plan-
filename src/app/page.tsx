import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

import { LinkButton } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PLATFORM_DISCLOSURE } from "@/lib/constants";
import { bpsToPercentLabel, formatCurrency } from "@/lib/format";

async function loadPlans() {
  try {
    return await Promise.race([
      prisma.investmentPlan.findMany({
        where: { isActive: true },
        orderBy: { minAmount: "asc" },
        take: 3,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Investment plan query timed out")), 5000)
      ),
    ]);
  } catch {
    return [];
  }
}

export default async function Home() {
  const plans = await loadPlans();

  return (
    <div className="flex-1 bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">Vantage</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-foreground hover:text-brand">
              Log in
            </Link>
            <LinkButton href="/signup" size="sm">
              Get started
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Manage your portfolio with confidence
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Vantage gives you a clear dashboard, market activity, and investment plans — all in
          one place, so you always know where your money stands.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <LinkButton href="/signup" size="lg">
            Create an account
          </LinkButton>
          <LinkButton href="/login" variant="outline" size="lg">
            Log in
          </LinkButton>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Portfolio dashboard",
              body: "Track your balance, active investments, and returns on a live dashboard.",
            },
            {
              title: "Market activity",
              body: "Follow price moves and platform news as they happen.",
            },
            {
              title: "Investment plans",
              body: "Choose from a range of plans built around different terms and risk levels.",
            },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Investment plans</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent>
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-brand">
                      {bpsToPercentLabel(plan.returnRateBps)}
                    </span>
                    <span className="text-xs text-muted">/ {plan.durationDays}d</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Min {formatCurrency(plan.minAmount)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        {PLATFORM_DISCLOSURE}
      </footer>
    </div>
  );
}
