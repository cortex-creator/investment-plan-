"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { neonAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { signupSchema, loginSchema } from "@/lib/validation/auth";
import { ROLE_USER, STARTING_BALANCE } from "@/lib/constants";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

async function ensureLocalUser(email: string, name: string, password?: string) {
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { role: true, portfolio: true },
  });

  if (existing) {
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash },
      });
    } else if (name && existing.name !== name) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { name },
      });
    }
    return existing;
  }

  const role = await prisma.role.findUnique({ where: { name: ROLE_USER } });
  if (!role) {
    throw new Error("Platform is not fully set up yet. Please contact support.");
  }

  const passwordHash = password
    ? await bcrypt.hash(password, 12)
    : await bcrypt.hash(crypto.randomUUID(), 12);

  return prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      roleId: role.id,
      portfolio: {
        create: {
          cashBalance: STARTING_BALANCE,
          totalDeposited: STARTING_BALANCE,
        },
      },
      notifications: {
        create: {
          type: "SUCCESS",
          title: "Welcome",
          message: "Your account was created with a starting balance of $" + STARTING_BALANCE.toLocaleString() + ".",
        },
      },
    },
  });
}

export async function signUpAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const { error } = await neonAuth.signUp.email({
    email: normalizedEmail,
    password,
    name,
  });

  if (error) {
    return { error: error.message || "Unable to create your account." };
  }

  try {
    await ensureLocalUser(normalizedEmail, name, password);
  } catch (err) {
    console.error("Local profile creation failed after Neon Auth signup", err);
    return {
      error:
        "Your authentication account was created, but your investment profile could not be initialized. Please contact support.",
    };
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const { error } = await neonAuth.signIn.email({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  try {
    const localUser = await ensureLocalUser(
      normalizedEmail,
      normalizedEmail.split("@")[0],
      password
    );
    redirect(localUser.role.name === "ADMIN" ? "/admin" : "/dashboard");
  } catch (err) {
    console.error("Local profile synchronization failed after Neon Auth login", err);
    return {
      error:
        "Authentication succeeded, but your investment profile could not be loaded. Please contact support.",
    };
  }
}
