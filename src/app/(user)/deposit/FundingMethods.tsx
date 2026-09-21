"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DepositForm } from "./DepositForm";

type Method = "bank" | "card" | "crypto";

const methods: { id: Method; label: string; available: boolean }[] = [
  { id: "bank", label: "Bank Transfer", available: true },
  { id: "card", label: "Debit / Credit Card", available: false },
  { id: "crypto", label: "Bitcoin", available: true },
];

export function FundingMethods({ instructions }: { instructions: string }) {
  const [active, setActive] = useState<Method>("crypto");

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <CardTitle>Add funds</CardTitle>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-muted p-1">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => m.available && setActive(m.id)}
              disabled={!m.available}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                active === m.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {m.label}
              {!m.available && <span className="ml-1 text-[10px] text-muted">(soon)</span>}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            {active === "crypto" ? "Bitcoin payment instructions" : "Transfer instructions"}
          </p>
          <p className="whitespace-pre-line rounded-lg border border-border bg-surface-muted p-4 text-sm text-muted">
            {instructions}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Submit your transfer details
          </p>
          <p className="mb-3 text-xs text-muted">
            {active === "crypto"
              ? "Send BTC to the address above, then enter the USD value of the transfer below. The request remains pending until it is manually verified."
              : "Once you&apos;ve sent the transfer, let us know the amount below. We&apos;ll confirm it and credit your balance once it&apos;s received."}
          </p>
          <DepositForm />
        </div>
      </CardContent>
    </Card>
  );
}
