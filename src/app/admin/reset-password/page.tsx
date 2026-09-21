"use client";

import { useState } from "react";
import { ForgotPasswordForm, ResetPasswordForm } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function AdminResetPasswordPage() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{email ? "Set a new password" : "Reset administrator password"}</CardTitle>
        </CardHeader>
        <CardContent>
          {email ? (
            <ResetPasswordForm
              authClient={authClient}
              email={email}
              onSuccess={() => {
                window.location.href = "/admin/login";
              }}
            />
          ) : (
            <ForgotPasswordForm
              authClient={authClient}
              redirectTo={`${window.location.origin}/admin/reset-password`}
              onSuccess={(data) => {
                setEmail(data.email);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
