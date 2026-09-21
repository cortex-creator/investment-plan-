import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { ROLE_ADMIN, ROLE_USER, PLATFORM_SETTING_KEYS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Refusing to run the demo seed in production. Set ALLOW_DEMO_SEED=true only when you explicitly intend to seed demo data."
    );
  }

  const [adminRole, userRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: ROLE_ADMIN },
      update: {},
      create: { name: ROLE_ADMIN, description: "Full administrative access to the platform." },
    }),
    prisma.role.upsert({
      where: { name: ROLE_USER },
      update: {},
      create: { name: ROLE_USER, description: "Standard account." },
    }),
  ]);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Platform Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      portfolio: {
        create: { cashBalance: 0, totalDeposited: 0 },
      },
    },
  });
  console.log(`Admin user ready: ${admin.email} (password from SEED_ADMIN_PASSWORD env var)`);

  const testInvestorPassword = process.env.SEED_DEMO_USER_PASSWORD ?? "Demo1234!";
  const testInvestorPasswordHash = await bcrypt.hash(testInvestorPassword, 12);
  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { name: "Test Account" },
    create: {
      name: "Test Account",
      email: "demo@example.com",
      passwordHash: testInvestorPasswordHash,
      roleId: userRole.id,
      portfolio: {
        create: { cashBalance: 10000, totalDeposited: 10000 },
      },
      notifications: {
        create: {
          type: "INFO",
          title: "Welcome",
          message: "Your account is ready.",
        },
      },
    },
  });
  console.log("Test account ready: demo@example.com (password from SEED_DEMO_USER_PASSWORD env var)");

  const plans = [
    { name: "Starter 30", slug: "starter-30", description: "Short-term entry plan for smaller balances.", minAmount: 10, maxAmount: 99, returnRateBps: 400, durationDays: 30, riskLevel: "LOW" as const },
    { name: "Starter 60", slug: "starter-60", description: "Flexible 60-day plan for growing balances.", minAmount: 10, maxAmount: 249, returnRateBps: 550, durationDays: 60, riskLevel: "LOW" as const },
    { name: "Starter 90", slug: "starter-90", description: "Longer starter term with a higher configured return.", minAmount: 25, maxAmount: 499, returnRateBps: 700, durationDays: 90, riskLevel: "LOW" as const },
    { name: "Balanced 30", slug: "balanced-30", description: "Short balanced plan for smaller and medium balances.", minAmount: 50, maxAmount: 499, returnRateBps: 600, durationDays: 30, riskLevel: "MEDIUM" as const },
    { name: "Balanced 60", slug: "balanced-60", description: "Balanced 60-day investment option.", minAmount: 50, maxAmount: 999, returnRateBps: 800, durationDays: 60, riskLevel: "MEDIUM" as const },
    { name: "Growth 90", slug: "growth-90", description: "90-day growth plan for medium balances.", minAmount: 100, maxAmount: 2499, returnRateBps: 900, durationDays: 90, riskLevel: "MEDIUM" as const },
    { name: "Growth 120", slug: "growth-120", description: "Four-month growth option for investors with more capital.", minAmount: 250, maxAmount: 4999, returnRateBps: 1100, durationDays: 120, riskLevel: "MEDIUM" as const },
    { name: "Growth 180", slug: "growth-180", description: "Six-month growth plan for longer-term goals.", minAmount: 500, maxAmount: 9999, returnRateBps: 1300, durationDays: 180, riskLevel: "MEDIUM" as const },
    { name: "Premium 90", slug: "premium-90", description: "Premium 90-day option for larger balances.", minAmount: 500, maxAmount: 4999, returnRateBps: 1200, durationDays: 90, riskLevel: "HIGH" as const },
    { name: "Premium 180", slug: "premium-180", description: "Premium six-month option for larger balances.", minAmount: 1000, maxAmount: 24999, returnRateBps: 1600, durationDays: 180, riskLevel: "HIGH" as const },
    { name: "Premium 270", slug: "premium-270", description: "Nine-month premium investment option.", minAmount: 2500, maxAmount: 49999, returnRateBps: 1900, durationDays: 270, riskLevel: "HIGH" as const },
    { name: "Premium 365", slug: "premium-365", description: "One-year premium option for long-term capital.", minAmount: 5000, maxAmount: null, returnRateBps: 2200, durationDays: 365, riskLevel: "HIGH" as const },
    { name: "Wealth 180", slug: "wealth-180", description: "High-balance wealth plan with a 180-day term.", minAmount: 10000, maxAmount: 99999, returnRateBps: 1800, durationDays: 180, riskLevel: "HIGH" as const },
    { name: "Wealth 365", slug: "wealth-365", description: "Long-term wealth plan for substantial balances.", minAmount: 25000, maxAmount: null, returnRateBps: 2500, durationDays: 365, riskLevel: "HIGH" as const },
    { name: "Elite 365", slug: "elite-365", description: "High-value annual investment option for qualifying balances.", minAmount: 100000, maxAmount: null, returnRateBps: 2800, durationDays: 365, riskLevel: "HIGH" as const },
  ];

  for (const plan of plans) {
    await prisma.investmentPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${plans.length} investment plans.`);

  const assets = [
    { symbol: "ABC", name: "ABC Corporation", type: "STOCK" as const, price: 128.42 },
    { symbol: "TNV", name: "TechNova Inc.", type: "STOCK" as const, price: 84.15 },
    { symbol: "GLDX", name: "GoldX Commodity Index", type: "COMMODITY" as const, price: 2312.6 },
    { symbol: "SIMCOIN", name: "SimCoin", type: "CRYPTO" as const, price: 41250.33 },
    { symbol: "GIDX", name: "Global Index", type: "INDEX" as const, price: 4521.88 },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { name: asset.name, type: asset.type },
      create: { ...asset, previousPrice: asset.price },
    });
  }
  console.log(`Seeded ${assets.length} assets.`);

  const abc = await prisma.asset.findUnique({ where: { symbol: "ABC" } });
  const simcoin = await prisma.asset.findUnique({ where: { symbol: "SIMCOIN" } });

  // Market events are a rolling feed, not user data — safe to reset and reseed.
  await prisma.marketEvent.deleteMany({});
  await prisma.marketEvent.createMany({
    data: [
      {
        category: "RATE_CHANGE",
        headline: "Platform interest rate increased to 4.2%",
        description: "The base rate used for new Starter Plan subscriptions was adjusted by the admin team.",
      },
      {
        category: "PRICE_MOVE",
        headline: "ABC shares increased 4.2%",
        assetId: abc?.id,
      },
      {
        category: "PRICE_MOVE",
        headline: "SimCoin up 2.1% on the day",
        assetId: simcoin?.id,
      },
      {
        category: "PLATFORM_NEWS",
        headline: "New Growth Plan now available",
        description: "A new 90-day investment plan was added.",
      },
      {
        category: "ACCOUNT_ACTIVITY",
        headline: "New signups this week",
        description: "Aggregate platform activity summary.",
      },
    ],
  });
  console.log("Seeded market events.");

  await prisma.platformSetting.upsert({
    where: { key: PLATFORM_SETTING_KEYS.SITE_NAME },
    update: { value: "Vantage" },
    create: { key: PLATFORM_SETTING_KEYS.SITE_NAME, value: "Vantage", description: "Public site name." },
  });
  const depositInstructions =
    process.env.SEED_DEPOSIT_INSTRUCTIONS ??
    "DEMO/SIMULATION ONLY\nNo real deposits are processed by this application.\n\nBank: Demo Commercial Bank\nAccount name: Vantage Demo Holdings\nAccount number: 0123456789\nRouting number: 021000021\n\nInclude your generated deposit reference in the transfer memo.\n\nThese banking details are placeholders for simulation and can be changed by an administrator in Platform Settings.";

  await prisma.platformSetting.upsert({
    where: { key: PLATFORM_SETTING_KEYS.DEPOSIT_INSTRUCTIONS },
    update: {
      value: depositInstructions,
    },
    create: {
      key: PLATFORM_SETTING_KEYS.DEPOSIT_INSTRUCTIONS,
      value: depositInstructions,
      description: "Shown on the user deposit page.",
    },
  });
  await prisma.platformSetting.upsert({
    where: { key: PLATFORM_SETTING_KEYS.DEPOSIT_REFERENCE_PREFIX },
    update: { value: "DEP" },
    create: {
      key: PLATFORM_SETTING_KEYS.DEPOSIT_REFERENCE_PREFIX,
      value: "DEP",
      description: "Prefix used when generating deposit reference codes.",
    },
  });
  await prisma.platformSetting.upsert({
    where: { key: PLATFORM_SETTING_KEYS.SUPPORT_EMAIL },
    update: {},
    create: {
      key: PLATFORM_SETTING_KEYS.SUPPORT_EMAIL,
      value: "support@example.com",
      description: "Contact email shown in the footer.",
    },
  });
  console.log("Seeded platform settings.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
