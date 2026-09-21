import { requireAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCandles } from "@/lib/candles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { formatCurrency, toNumber } from "@/lib/format";
import { TickControls } from "./TickControls";

export default async function AdminAssetTradeControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) notFound();

  const candles = await getCandles(asset.id, 80);
  const price = toNumber(asset.price);
  const prev = toNumber(asset.previousPrice);
  const changePct = prev === 0 ? 0 : ((price - prev) / prev) * 100;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {asset.symbol} <span className="text-muted">— {asset.name}</span>
        </h1>
        <p className="text-sm text-muted">Push the price up or down to shape the chart traders see.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted">Current price</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(price)}</p>
          <p className={`mt-1 text-sm font-medium ${changePct >= 0 ? "text-success" : "text-danger"}`}>
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}% last tick
          </p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-sm text-muted">Move the market</p>
          <TickControls assetId={asset.id} />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live chart</CardTitle>
        </CardHeader>
        <CardContent>
          <CandlestickChart candles={candles} />
        </CardContent>
      </Card>
    </div>
  );
}
