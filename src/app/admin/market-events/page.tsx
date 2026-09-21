import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { MarketEventForm } from "./MarketEventForm";
import { DeleteEventButton } from "./DeleteEventButton";

const categoryLabel: Record<string, string> = {
  RATE_CHANGE: "Rate change",
  PRICE_MOVE: "Price move",
  ACCOUNT_ACTIVITY: "Account activity",
  PLATFORM_NEWS: "Platform news",
};

export default async function AdminMarketEventsPage() {
  await requireAdmin();
  const [assets, events] = await Promise.all([
    prisma.asset.findMany({
      select: { id: true, symbol: true, name: true },
      orderBy: { symbol: "asc" },
    }),
    prisma.marketEvent.findMany({
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Market Activity / News</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post a market update</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketEventForm assets={assets} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="flex gap-3">
                  <Badge variant="neutral" className="mt-0.5 shrink-0">
                    {categoryLabel[event.category] ?? event.category}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.headline}</p>
                    {event.description && <p className="text-xs text-muted">{event.description}</p>}
                    <p className="text-xs text-muted">
                      {formatDateTime(event.createdAt)}
                      {event.asset ? ` · ${event.asset.symbol}` : ""}
                    </p>
                  </div>
                </div>
                <DeleteEventButton eventId={event.id} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
