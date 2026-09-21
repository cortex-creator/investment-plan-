import { requireAdmin } from "@/lib/authz";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toNumber } from "@/lib/format";
import { AssetPriceForm } from "./AssetPriceForm";
import { ToggleAssetButton } from "./ToggleAssetButton";

export default async function AdminAssetsPage() {
  await requireAdmin();
  const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Asset Prices</h1>
        <p className="text-sm text-muted">
          Updating a price automatically records the previous price and posts a market event.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Previous</th>
                  <th className="px-5 py-3 font-medium">New price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{asset.symbol}</td>
                    <td className="px-5 py-3 text-muted">{asset.name}</td>
                    <td className="px-5 py-3 text-muted">{asset.type}</td>
                    <td className="px-5 py-3 text-muted">${toNumber(asset.previousPrice).toFixed(4)}</td>
                    <td className="px-5 py-3">
                      <AssetPriceForm assetId={asset.id} currentPrice={toNumber(asset.price)} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={asset.isActive ? "success" : "neutral"}>
                        {asset.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ToggleAssetButton assetId={asset.id} isActive={asset.isActive} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/assets/${asset.id}/trade-control`}
                        className="text-brand hover:underline"
                      >
                        Trading controls
                      </Link>
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
