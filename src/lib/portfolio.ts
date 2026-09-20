import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export async function getPortfolioOverview(userId: string) {
  const [portfolio, investments, openTrades] = await Promise.all([
    prisma.portfolio.findUnique({ where: { userId } }),
    prisma.userInvestment.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paperTrade.findMany({
      where: { userId, status: "OPEN" },
      include: { asset: true },
    }),
  ]);

  const cashBalance = portfolio ? toNumber(portfolio.cashBalance) : 0;
  const totalDeposited = portfolio ? toNumber(portfolio.totalDeposited) : 0;

  const activeInvestments = investments.filter((inv) => inv.status === "ACTIVE");
  const activeInvestedValue = activeInvestments.reduce(
    (sum, inv) => sum + toNumber(inv.currentValue),
    0
  );
  const activePrincipal = activeInvestments.reduce((sum, inv) => sum + toNumber(inv.principal), 0);

  const totalReturns = investments.reduce(
    (sum, inv) => sum + (toNumber(inv.currentValue) - toNumber(inv.principal)),
    0
  );

  const openTradesValue = openTrades.reduce(
    (sum, t) => sum + toNumber(t.quantity) * toNumber(t.asset.price),
    0
  );
  const openTradesPnl = openTrades.reduce(
    (sum, t) => sum + (toNumber(t.asset.price) - toNumber(t.entryPrice)) * toNumber(t.quantity),
    0
  );

  const totalPortfolioValue = cashBalance + activeInvestedValue + openTradesValue;

  return {
    portfolio,
    investments,
    activeInvestments,
    openTrades,
    cashBalance,
    totalDeposited,
    activeInvestedValue,
    activePrincipal,
    totalReturns,
    openTradesValue,
    openTradesPnl,
    totalPortfolioValue,
  };
}

/**
 * Returns true portfolio valuation history from daily market-aware snapshots.
 * Falls back to transaction-derived history until the scheduled snapshot job
 * has produced enough points.
 */
export async function getPortfolioHistory(userId: string) {
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId },
    orderBy: { capturedAt: "asc" },
  });

  if (snapshots.length >= 2) {
    return snapshots.map((snapshot) => ({
      date: snapshot.capturedAt.toISOString(),
      value: toNumber(snapshot.totalValue),
    }));
  }

  const [transactions, closedTrades] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paperTrade.findMany({
      where: { userId, status: "CLOSED" },
      orderBy: { closedAt: "asc" },
    }),
  ]);

  type Event = { date: Date; delta: number };
  const events: Event[] = [];

  for (const tx of transactions) {
    const amount = toNumber(tx.amount);
    switch (tx.type) {
      case "DEPOSIT":
      case "RETURN":
      case "ADJUSTMENT":
        events.push({ date: tx.createdAt, delta: amount });
        break;
      case "WITHDRAWAL":
        events.push({ date: tx.createdAt, delta: -amount });
        break;
      case "INVESTMENT":
        break;
    }
  }

  for (const trade of closedTrades) {
    if (!trade.closedAt || trade.pnl === null) continue;
    events.push({ date: trade.closedAt, delta: toNumber(trade.pnl) });
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const points: { date: string; value: number }[] = [];

  for (const event of events) {
    running += event.delta;
    points.push({
      date: event.date.toISOString(),
      value: Math.max(0, running),
    });
  }

  return points;
}
