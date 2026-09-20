import type { Asset } from "@prisma/client";
import { formatCurrency, toNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AssetPriceList({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return <p className="text-sm text-muted">No assets configured yet.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {assets.map((asset) => {
        const price = toNumber(asset.price);
        const prev = toNumber(asset.previousPrice);
        const change = prev === 0 ? 0 : ((price - prev) / prev) * 100;
        const positive = change >= 0;

        return (
          <div key={asset.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{asset.symbol}</p>
              <p className="text-xs text-muted">{asset.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{formatCurrency(price, { currency: asset.currency })}</p>
              <p className={cn("text-xs font-medium", positive ? "text-success" : "text-danger")}>
                {positive ? "+" : ""}
                {change.toFixed(2)}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
