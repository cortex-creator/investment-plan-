"use client";

import { useActionState } from "react";
import { adminLoginAction, type FormState } from "@/lib/actions/auth";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import Link from "next/link";

const initialState: FormState = {};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <div>
        <Label htmlFor="admin-email">Administrator email</Label>
        <Input id="admin-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <Label htmlFor="admin-password">Password</Label>
        <Input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Authenticating…" : "Administrator sign in"}
      </Button>
      <div className="text-center">
        <Link href="/admin/reset-password" className="text-sm underline underline-offset-4">
          Forgot administrator password?
        </Link>
      </div>
    </form>
  );
}
