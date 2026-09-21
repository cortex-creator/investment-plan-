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

const ACTION_TIMEOUT_MS = 10000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = ACTION_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function ensureLocalUser(email: string, name: string, password?: string) {
  const normalizedEmail = email.toLowerCase();

  const existing = await withTimeout(
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true, portfolio: true },
    })
  );

  if (existing) {
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await withTimeout(
        prisma.user.update({
          where: { id: existing.id },
          data: { name, passwordHash },
        })
      );
    } else if (name && existing.name !== name) {
      await withTimeout(
        prisma.user.update({
          where: { id: existing.id },
          data: { name },
        })
      );
    }
    return existing;
  }

  const role = await withTimeout(prisma.role.findUnique({ where: { name: ROLE_USER } }));
  if (!role) {
    throw new Error("Platform is not fully set up yet. Please contact support.");
  }

  const passwordHash = password
    ? await bcrypt.hash(password, 12)
    : await bcrypt.hash(crypto.randomUUID(), 12);

  return withTimeout(
    prisma.user.create({
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
            message:
              "Your account was created with a starting balance of $" +
              STARTING_BALANCE.toLocaleString() +
              ".",
          },
        },
      },
    })
  );
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

  try {
    const result = await withTimeout(
      neonAuth.signUp.email({
        email: normalizedEmail,
        password,
        name,
      })
    );

    if (result.error) {
      return { error: result.error.message || "Unable to create your account." };
    }

    await ensureLocalUser(normalizedEmail, name, password);
  } catch (err) {
    console.error("Signup failed", err);
    return {
      error:
        err instanceof Error && err.message.includes("timed out")
          ? "The authentication service is taking too long to respond. Please try again."
          : "Unable to create your account. Please try again.",
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

  let localUser;
  try {
    const result = await withTimeout(
      neonAuth.signIn.email({
        email: normalizedEmail,
        password,
      })
    );

    if (result.error) {
      return { error: "Invalid email or password." };
    }

    localUser = await ensureLocalUser(
      normalizedEmail,
      normalizedEmail.split("@")[0],
      password
    );
  } catch (err) {
    console.error("Login failed", err);
    return {
      error:
        err instanceof Error && err.message.includes("timed out")
          ? "The authentication service is taking too long to respond. Please try again."
          : "Invalid email or password.",
    };
  }

  redirect(localUser.role.name === "ADMIN" ? "/admin" : "/dashboard");
}
