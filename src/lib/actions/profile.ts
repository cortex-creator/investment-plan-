"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/authz";
import { neonAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/auth";
import type { FormState } from "@/lib/actions/auth";

export async function updateProfileAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  const { error } = await neonAuth.updateUser({ name: parsed.data.name });
  if (error) {
    return { error: error.message || "Profile updated locally, but authentication profile update failed." };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function changePasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await neonAuth.changePassword({
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: true,
  });

  if (result.error) {
    return { error: result.error.message || "Unable to change your password." };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
