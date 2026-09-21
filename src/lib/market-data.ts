import { prisma } from "@/lib/prisma";

const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
const COINGECKO_URL = "https://api.coingecko.com/api/v3";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const PUBLIC_FX_URL = "https://open.er-api.com/v6/latest/USD";

type MarketPoint = {
  symbol: string;
  name: string;
  type: "STOCK" | "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX";
  price: number;
  previousPrice: number;
  currency: string;
  externalSymbol?: string;
  externalId?: string;
  marketCap?: number;
  volume24h?: number;
  source: string;
  timestamp: Date;
};

const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
const coinGeckoKey = process.env.COINGECKO_API_KEY;

async function jsonFetch(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Market API request failed: ${response.status}`);
  }
  return response.json();
}

async function fetchAlphaStock(symbol: string): Promise<MarketPoint | null> {
  if (!alphaKey) return null;

  const url = `${ALPHA_VANTAGE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
    symbol
  )}&outputsize=compact&apikey=${encodeURIComponent(alphaKey)}`;
  const data = await jsonFetch(url);
  const series = data["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
  if (!series) return null;

  const dates = Object.keys(series).sort().reverse();
  if (!dates[0]) return null;

  const latest = series[dates[0]];
  const previous = dates[1] ? series[dates[1]] : latest;
  const price = Number(latest["4. close"]);
  const previousPrice = Number(previous["4. close"]);

  if (!Number.isFinite(price)) return null;

  return {
    symbol,
    name: symbol,
    type: "STOCK",
    price,
    previousPrice: Number.isFinite(previousPrice) ? previousPrice : price,
    currency: "USD",
    externalSymbol: symbol,
    source: "alpha_vantage",
    timestamp: new Date(`${dates[0]}T23:59:59Z`),
  };
}

async function fetchYahooStock(symbol: string): Promise<MarketPoint | null> {
  const url =
    `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=1d&interval=1m&events=quote`;
  const data = await jsonFetch(url);
  const meta = data?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice ?? meta?.previousClose);
  const previousPrice = Number(meta?.previousClose ?? price);

  if (!Number.isFinite(price)) return null;

  return {
    symbol,
    name: String(meta?.longName ?? meta?.shortName ?? symbol),
    type: symbol === "SPY" ? "INDEX" : "STOCK",
    price,
    previousPrice: Number.isFinite(previousPrice) ? previousPrice : price,
    currency: String(meta?.currency ?? "USD"),
    externalSymbol: symbol,
    source: "yahoo_finance",
    timestamp: new Date(),
  };
}

async function fetchAlphaForex(from: string, to: string): Promise<MarketPoint | null> {
  if (!alphaKey) return null;

  const url = `${ALPHA_VANTAGE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${encodeURIComponent(
    alphaKey
  )}`;
  const data = await jsonFetch(url);
  const quote = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  if (!quote) return null;

  const price = Number(quote["5. Exchange Rate"]);
  if (!Number.isFinite(price)) return null;

  return {
    symbol: `${from}/${to}`,
    name: `${from} to ${to}`,
    type: "FOREX",
    price,
    previousPrice: price,
    currency: to,
    externalSymbol: `${from}${to}`,
    source: "alpha_vantage",
    timestamp: new Date(),
  };
}

async function fetchPublicForex(): Promise<MarketPoint | null> {
  const data = await jsonFetch(PUBLIC_FX_URL);
  const price = Number(data?.rates?.NGN);
  if (!Number.isFinite(price)) return null;

  return {
    symbol: "USD/NGN",
    name: "US Dollar to Nigerian Naira",
    type: "FOREX",
    price,
    previousPrice: price,
    currency: "NGN",
    externalSymbol: "USDNGN",
    source: "exchange_rate_api",
    timestamp: new Date(),
  };
}

async function fetchCoinGecko(): Promise<MarketPoint[]> {
  const keyParam = coinGeckoKey
    ? `&x_cg_demo_api_key=${encodeURIComponent(coinGeckoKey)}`
    : "";

  const url =
    `${COINGECKO_URL}/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&` +
    `price_change_percentage=24h${keyParam}`;

  const data = (await jsonFetch(url)) as Array<{
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number | null;
    market_cap: number | null;
    total_volume: number | null;
  }>;

  return data
    .filter((coin) => Number.isFinite(coin.current_price))
    .map((coin) => {
      const change = Number(coin.price_change_percentage_24h ?? 0);
      const previousPrice =
        Number.isFinite(change) && change !== -100
          ? coin.current_price / (1 + change / 100)
          : coin.current_price;

      return {
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        type: "CRYPTO" as const,
        price: coin.current_price,
        previousPrice,
        currency: "USD",
        externalSymbol: coin.symbol.toUpperCase(),
        externalId: coin.id,
        marketCap: coin.market_cap ?? undefined,
        volume24h: coin.total_volume ?? undefined,
        source: "coingecko",
        timestamp: new Date(),
      };
    });
}

async function saveMarketPoint(point: MarketPoint) {
  const existing = await prisma.asset.findUnique({ where: { symbol: point.symbol } });

  const previousPrice =
    existing && point.previousPrice === point.price
      ? Number(existing.price)
      : point.previousPrice;

  const asset = await prisma.asset.upsert({
    where: { symbol: point.symbol },
    update: {
      name: point.name,
      type: point.type,
      previousPrice,
      price: point.price,
      externalSymbol: point.externalSymbol,
      externalId: point.externalId,
      currency: point.currency,
      marketCap: point.marketCap,
      volume24h: point.volume24h,
      dataSource: point.source,
      lastFetchedAt: new Date(),
      isActive: true,
    },
    create: {
      symbol: point.symbol,
      name: point.name,
      type: point.type,
      price: point.price,
      previousPrice: point.previousPrice,
      externalSymbol: point.externalSymbol,
      externalId: point.externalId,
      currency: point.currency,
      marketCap: point.marketCap,
      volume24h: point.volume24h,
      dataSource: point.source,
      lastFetchedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.priceCandle.create({
    data: {
      assetId: asset.id,
      timestamp: point.timestamp,
      open: point.price,
      high: point.price,
      low: point.price,
      close: point.price,
      dataSource: point.source,
    },
  });

  return asset;
}

async function snapshotPortfolios() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const capturedAt = new Date();
  capturedAt.setUTCHours(0, 0, 0, 0);

  let count = 0;
  for (const user of users) {
    const [portfolio, investments, trades] = await Promise.all([
      prisma.portfolio.findUnique({ where: { userId: user.id } }),
      prisma.userInvestment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
      }),
      prisma.paperTrade.findMany({
        where: { userId: user.id, status: "OPEN" },
        include: { asset: true },
      }),
    ]);

    const cashBalance = Number(portfolio?.cashBalance ?? 0);
    const investedValue = investments.reduce((sum, item) => sum + Number(item.currentValue), 0);
    const tradeValue = trades.reduce(
      (sum, trade) => sum + Number(trade.quantity) * Number(trade.asset.price),
      0
    );
    const totalValue = cashBalance + investedValue + tradeValue;

    await prisma.portfolioSnapshot.upsert({
      where: { userId_capturedAt: { userId: user.id, capturedAt } },
      update: { totalValue, cashBalance, investedValue, tradeValue },
      create: { userId: user.id, totalValue, cashBalance, investedValue, tradeValue, capturedAt },
    });
    count++;
  }

  return count;
}

export async function syncMarketData() {
  const points: MarketPoint[] = [];
  const errors: string[] = [];

  const stocks = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "SPY"];

  for (const symbol of stocks) {
    try {
      const point = (await fetchAlphaStock(symbol)) ?? (await fetchYahooStock(symbol));
      if (point) points.push(point);
    } catch (error) {
      errors.push(`${symbol}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  try {
    const forex = (await fetchAlphaForex("USD", "NGN")) ?? (await fetchPublicForex());
    if (forex) points.push(forex);
  } catch (error) {
    errors.push(`USD/NGN: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  try {
    points.push(...(await fetchCoinGecko()));
  } catch (error) {
    errors.push(`CoinGecko: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  for (const point of points) {
    await saveMarketPoint(point);
  }

  const snapshots = await snapshotPortfolios();

  return {
    syncedAssets: points.length,
    snapshots,
    providers: {
      alphaVantage: Boolean(alphaKey),
      yahooFinance: true,
      exchangeRateApi: true,
      coinGecko: true,
    },
    errors,
  };
}
