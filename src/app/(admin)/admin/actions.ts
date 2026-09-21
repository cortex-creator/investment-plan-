"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/format";

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function textValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  if (!id) return;
  const minAmount = Math.max(0, numberValue(formData.get("minAmount")));
  const maxRaw = textValue(formData.get("maxAmount"));
  const maxAmount = maxRaw ? Math.max(minAmount, Number(maxRaw)) : null;
  const returnRate = Math.max(0, numberValue(formData.get("returnRate")));
  const durationDays = Math.max(1, Math.floor(numberValue(formData.get("durationDays"), 30)));
  const description = textValue(formData.get("description"));

  await prisma.investmentPlan.update({
    where: { id },
    data: {
      minAmount,
      maxAmount,
      returnRateBps: Math.round(returnRate * 100),
      durationDays,
      description,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/plans");
}

export async function togglePlan(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  if (!id) return;
  const plan = await prisma.investmentPlan.findUnique({ where: { id }, select: { isActive: true } });
  if (!plan) return;
  await prisma.investmentPlan.update({ where: { id }, data: { isActive: !plan.isActive } });
  revalidatePath("/admin");
  revalidatePath("/plans");
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  const active = textValue(formData.get("active")) === "true";
  const roleName = textValue(formData.get("role"));
  if (!id) return;

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return;

  await prisma.user.update({
    where: { id },
    data: { isActive: active, roleId: role.id },
  });

  revalidatePath("/admin");
}

export async function adjustBalance(formData: FormData) {
  await requireAdmin();
  const userId = textValue(formData.get("userId"));
  const type = textValue(formData.get("type"));
  const amount = Math.max(0, numberValue(formData.get("amount")));
  const description = textValue(formData.get("description")) || "Admin balance adjustment";
  if (!userId || amount <= 0 || !["DEPOSIT", "WITHDRAWAL"].includes(type)) return;

  await prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUnique({ where: { userId } });
    if (!portfolio) throw new Error("User portfolio not found");

    const current = Number(portfolio.cashBalance);
    if (type === "WITHDRAWAL" && current < amount) {
      throw new Error("Insufficient available balance");
    }

    const nextBalance = type === "DEPOSIT" ? current + amount : current - amount;

    await tx.portfolio.update({
      where: { userId },
      data: {
        cashBalance: new Prisma.Decimal(nextBalance),
        ...(type === "DEPOSIT"
          ? { totalDeposited: { increment: new Prisma.Decimal(amount) } }
          : {}),
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: type as "DEPOSIT" | "WITHDRAWAL",
        status: "COMPLETED",
        amount: new Prisma.Decimal(amount),
        description,
        reference: generateReference(type === "DEPOSIT" ? "ADMDEP" : "ADMWD"),
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/transactions");
}

export async function updateTransactionStatus(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  const status = textValue(formData.get("status"));
  if (!id || !["PENDING", "COMPLETED", "FAILED"].includes(status)) return;

  await prisma.transaction.update({
    where: { id },
    data: { status: status as "PENDING" | "COMPLETED" | "FAILED" },
  });

  revalidatePath("/admin");
  revalidatePath("/transactions");
}

export async function updateInvestment(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  const status = textValue(formData.get("status"));
  const currentValue = Math.max(0, numberValue(formData.get("currentValue")));
  if (!id || !["ACTIVE", "COMPLETED", "CANCELLED"].includes(status)) return;

  await prisma.userInvestment.update({
    where: { id },
    data: {
      status: status as "ACTIVE" | "COMPLETED" | "CANCELLED",
      currentValue: new Prisma.Decimal(currentValue),
      ...(status === "COMPLETED" ? { endDate: new Date() } : {}),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/portfolio");
}

export async function upsertAsset(formData: FormData) {
  await requireAdmin();
  const id = textValue(formData.get("id"));
  const symbol = textValue(formData.get("symbol")).toUpperCase();
  const name = textValue(formData.get("name"));
  const type = textValue(formData.get("type"));
  const price = Math.max(0, numberValue(formData.get("price")));
  const active = textValue(formData.get("active")) === "true";
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
        price: new Prisma.Decimal(price),
        isActive: active,
      },
    });
  } else {
    await prisma.asset.create({
      data: {
        symbol,
        name,
        type: type as "STOCK" | "CRYPTO" | "COMMODITY" | "INDEX" | "FOREX",
        price: new Prisma.Decimal(price),
        previousPrice: new Prisma.Decimal(price),
        isActive: true,
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/trade");
}

export async function createMarketEvent(formData: FormData) {
  await requireAdmin();
  const headline = textValue(formData.get("headline"));
  const description = textValue(formData.get("description"));
  const category = textValue(formData.get("category"));
  const assetId = textValue(formData.get("assetId"));
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

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateSetting(formData: FormData) {
  await requireAdmin();
  const key = textValue(formData.get("key"));
  const value = textValue(formData.get("value"));
  if (!key) return;

  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/deposit");
}

export async function sendNotification(formData: FormData) {
  await requireAdmin();
  const userId = textValue(formData.get("userId"));
  const title = textValue(formData.get("title"));
  const message = textValue(formData.get("message"));
  const type = textValue(formData.get("type"));
  if (!userId || !title || !message || !["INFO", "SUCCESS", "WARNING", "MARKET"].includes(type)) return;

  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type as "INFO" | "SUCCESS" | "WARNING" | "MARKET",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/notifications");
}
