import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") redirect("/admin");
    return (
      <Card>
        <CardHeader><CardTitle>Administrator access required</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Your account is signed in, but it is not authorized to access the administrator console.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrator Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
        <p className="mt-4 text-center text-xs text-muted">Administrator access is restricted to active accounts with the ADMIN role.</p>
      </CardContent>
    </Card>
  );
}
