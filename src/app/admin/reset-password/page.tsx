"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type PasswordResetClient = {
  requestPasswordReset: (input: {
    email: string;
    redirectTo: string;
  }) => Promise<{ error?: { message?: string } | null }>;
  resetPassword: (input: {
    token: string;
    newPassword: string;
  }) => Promise<{ error?: { message?: string } | null }>;
};

const passwordResetClient = authClient as unknown as PasswordResetClient;

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const result = await passwordResetClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (result.error) {
        setError(result.error.message || "Unable to send the password reset email.");
      } else {
        setMessage("If this administrator email is registered, a password reset link has been sent.");
      }
    } catch {
      setError("Unable to send the password reset email. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      setPending(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const result = await passwordResetClient.resetPassword({
        token: token || "",
        newPassword,
      });

      if (result.error) {
        setError(result.error.message || "This password reset link is invalid or expired.");
      } else {
        router.replace("/admin/login?reset=success");
      }
    } catch {
      setError("This password reset link is invalid or expired. Please request a new one.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{token ? "Set a new administrator password" : "Reset administrator password"}</CardTitle>
        </CardHeader>
        <CardContent>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          {token ? (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Updating password…" : "Set new password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={requestReset} className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Administrator email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending reset link…" : "Send reset link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm underline underline-offset-4"
                  onClick={() => router.push("/admin/login")}
                >
                  Back to administrator sign in
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
