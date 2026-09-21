import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AdminChangePasswordForm } from "./AdminChangePasswordForm";

export default async function AdminChangePasswordPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  if (!session.user.mustChangePassword) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change administrator password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-muted">
            Your temporary administrator password must be changed before you can access the admin console.
          </p>
          <AdminChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
