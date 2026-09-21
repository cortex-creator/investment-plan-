"use client";

import { useActionState } from "react";
import { changeAdminPasswordAction, type FormState } from "@/lib/actions/auth";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: FormState = {};

export function AdminChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeAdminPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating password…" : "Set new password"}
      </Button>
    </form>
  );
}
