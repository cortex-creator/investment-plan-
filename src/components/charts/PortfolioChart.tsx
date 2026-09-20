"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/format";

type Point = { date: string; value: number };

export function PortfolioChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted">
        Not enough portfolio history yet. Complete a deposit or investment transaction to start
        building your portfolio value chart.
      </div>
    );
  }

  const data = points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={36}
          />

          <YAxis
            stroke="var(--color-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={76}
            tickFormatter={(value) =>
              formatCurrency(Number(value), {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }
          />

          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value) => [formatCurrency(Number(value)), "Portfolio value"]}
          />

          <Area
            type="monotone"
            dataKey="value"
            name="Portfolio value"
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            fill="url(#portfolioValueFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
