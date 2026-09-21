"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/format";

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  if (!id) return;
  const minAmount = Math.max(0, num(formData.get("minAmount")));
  const maxRaw = text(formData.get("maxAmount"));
  const maxAmount = maxRaw ? Math.max(minAmount, num(formData.get("maxAmount"))) : null;
  await prisma.investmentPlan.update({
    where: { id },
    data: {
      minAmount,
      maxAmount,
      returnRateBps: Math.max(0, Math.round(num(formData.get("returnRate")) * 100)),
      durationDays: Math.max(1, Math.floor(num(formData.get("durationDays"), 30))),
      description: text(formData.get("description")),
    },
  });
  revalidatePath("/admin"); revalidatePath("/plans");
}

export async function togglePlan(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  if (!id) return;
  const plan = await prisma.investmentPlan.findUnique({ where: { id }, select: { isActive: true } });
  if (plan) await prisma.investmentPlan.update({ where: { id }, data: { isActive: !plan.isActive } });
  revalidatePath("/admin"); revalidatePath("/plans");
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  const role = await prisma.role.findUnique({ where: { name: text(formData.get("role")) } });
  if (!id || !role) return;
  await prisma.user.update({
    where: { id },
    data: { isActive: text(formData.get("active")) === "true", roleId: role.id },
  });
  revalidatePath("/admin");
}

export async function adjustBalance(formData: FormData) {
  await requireAdmin();
  const userId = text(formData.get("userId"));
  const type = text(formData.get("type"));
  const amount = Math.max(0, num(formData.get("amount")));
  if (!userId || amount <= 0 || !["DEPOSIT", "WITHDRAWAL"].includes(type)) return;

  await prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new Error("User portfolio not found");
    const balance = Number(portfolio.cashBalance);
    if (type === "WITHDRAWAL" && balance < amount) throw new Error("Insufficient available balance");

    await tx.portfolio.update({
      where: { userId },
      data: {
        cashBalance: type === "DEPOSIT" ? balance + amount : balance - amount,
        ...(type === "DEPOSIT" ? { totalDeposited: { increment: amount } } : {}),
      },
    });
    await tx.transaction.create({
      data: {
        userId,
        type: type as "DEPOSIT" | "WITHDRAWAL",
        status: "COMPLETED",
        amount,
        description: text(formData.get("description")) || "Admin balance adjustment",
        reference: generateReference(type === "DEPOSIT" ? "ADMDEP" : "ADMWD"),
      },
    });
  });

  revalidatePath("/admin"); revalidatePath("/dashboard"); revalidatePath("/portfolio"); revalidatePath("/transactions");
}

export async function updateTransactionStatus(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  const status = text(formData.get("status"));
  if (!id || !["PENDING", "COMPLETED", "FAILED"].includes(status)) return;
  await prisma.transaction.update({ where: { id }, data: { status: status as "PENDING" | "COMPLETED" | "FAILED" } });
  revalidatePath("/admin"); revalidatePath("/transactions");
}

export async function updateInvestment(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  const status = text(formData.get("status"));
  if (!id || !["ACTIVE", "COMPLETED", "CANCELLED"].includes(status)) return;
  await prisma.userInvestment.update({
    where: { id },
    data: {
      status: status as "ACTIVE" | "COMPLETED" | "CANCELLED",
      currentValue: Math.max(0, num(formData.get("currentValue"))),
      ...(status === "COMPLETED" ? { endDate: new Date() } : {}),
    },
  });
  revalidatePath("/admin"); revalidatePath("/portfolio");
}

export async function upsertAsset(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  const symbol = text(formData.get("symbol")).toUpperCase();
  const name = text(formData.get("name"));
  const type = text(formData.get("type"));
  const price = Math.max(0, num(formData.get("price")));
  if (!symbol || !name || !["STOCK", "CRYPTO", "COMMODITY", "INDEX", "FOREX"].includes(type)) return;

  if (id) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return;
    await prisma.asset.update({
      where: { id },
      data: {
        name,
        type: type as "STOCK" | "CRYPTO" | "COMMODITY" | "INDEX" | "FOREX",
        previousPrice: asset.price,
        price,
        isActive: text(formData.get("active")) === "true",
      },
    });
  } else {
    await prisma.asset.create({
      data: {
        symbol,
        name,
        type: type as "STOCK" | "CRYPTO" | "COMMODITY" | "INDEX" | "FOREX",
        price,
        previousPrice: price,
        isActive: true,
      },
    });
  }
  revalidatePath("/admin"); revalidatePath("/dashboard"); revalidatePath("/trade");
}

export async function createMarketEvent(formData: FormData) {
  await requireAdmin();
  const headline = text(formData.get("headline"));
  const description = text(formData.get("description"));
  const category = text(formData.get("category"));
  const assetId = text(formData.get("assetId"));
  if (!headline || !["RATE_CHANGE", "PRICE_MOVE", "ACCOUNT_ACTIVITY", "PLATFORM_NEWS"].includes(category)) return;
  await prisma.marketEvent.create({
    data: {
      headline,
      description: description || null,
      category: category as "RATE_CHANGE" | "PRICE_MOVE" | "ACCOUNT_ACTIVITY" | "PLATFORM_NEWS",
      assetId: assetId || null,
      isSimulated: true,
    },
  });
  revalidatePath("/admin"); revalidatePath("/dashboard");
}

export async function updateSetting(formData: FormData) {
  await requireAdmin();
  const key = text(formData.get("key"));
  if (!key) return;
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: text(formData.get("value")) },
    update: { value: text(formData.get("value")) },
  });
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/deposit");
}

export async function sendNotification(formData: FormData) {
  await requireAdmin();
  const userId = text(formData.get("userId"));
  const title = text(formData.get("title"));
  const message = text(formData.get("message"));
  const type = text(formData.get("type"));
  if (!userId || !title || !message || !["INFO", "SUCCESS", "WARNING", "MARKET"].includes(type)) return;
  await prisma.notification.create({
    data: { userId, title, message, type: type as "INFO" | "SUCCESS" | "WARNING" | "MARKET" },
  });
  revalidatePath("/admin"); revalidatePath("/notifications");
}
