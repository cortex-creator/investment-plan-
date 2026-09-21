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

  redirect(localUser.role.name === "ADMIN" ? (localUser.mustChangePassword ? "/admin/change-password" : "/admin") : "/dashboard");
}


export async function adminLoginAction(
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

  const normalizedEmail = parsed.data.email.toLowerCase();

  try {
    const result = await withTimeout(
      neonAuth.signIn.email({
        email: normalizedEmail,
        password: parsed.data.password,
      })
    );

    if (result.error || !result.data?.user?.email) {
      return { error: "Invalid administrator email or password." };
    }

    const localUser = await withTimeout(
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { role: true },
      })
    );

    if (!localUser?.isActive || localUser.role.name !== "ADMIN") {
      try {
        await neonAuth.signOut();
      } catch (signOutError) {
        console.error("Non-admin sign out failed", signOutError);
      }
      return { error: "This account is not authorized for administrator access." };
    }
  } catch (err) {
    console.error("Admin login failed", err);
    return {
      error:
        err instanceof Error && err.message.includes("timed out")
          ? "The authentication service is taking too long to respond. Please try again."
          : "Invalid administrator email or password.",
    };
  }

  redirect(localUser.mustChangePassword ? "/admin/change-password" : "/admin");
}

export async function changeAdminPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    return { error: "Please enter your current temporary password." };
  }

  if (newPassword.length < 8) {
    return { error: "Your new password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "The new passwords do not match." };
  }

  try {
    const session = await withTimeout(neonAuth.getSession());
    const email = session?.data?.user?.email?.toLowerCase();
    if (!email) return { error: "Your administrator session has expired. Please sign in again." };

    const localUser = await withTimeout(
      prisma.user.findUnique({ where: { email }, include: { role: true } })
    );

    if (!localUser?.isActive || localUser.role.name !== "ADMIN") {
      return { error: "Administrator access is required." };
    }

    const result = await withTimeout(
      neonAuth.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
    );

    if (result?.error) {
      return { error: result.error.message || "Unable to change the password." };
    }

    await withTimeout(
      prisma.user.update({
        where: { id: localUser.id },
        data: { mustChangePassword: false },
      })
    );
  } catch (err) {
    console.error("Admin password change failed", err);
    return { error: "Unable to change the password. Please try again." };
  }

  redirect("/admin");
}

export async function signOutAction() {
  try {
    await neonAuth.signOut();
  } catch (err) {
    console.error("Sign out failed", err);
  }

  redirect("/login");
}
