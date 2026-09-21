import { requireAdmin } from "@/lib/authz";
import { AppShell, type NavItem } from "@/components/nav/AppShell";

const navItems: NavItem[] = [
  { href: "/admin", label: "Admin Overview" },
  { href: "/dashboard", label: "User Dashboard" },
  { href: "/plans", label: "Investment Plans" },
  { href: "/transactions", label: "Transactions" },
  { href: "/deposit", label: "Add Funds" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <AppShell
      navItems={navItems}
      brandLabel="Vantage Admin"
      userName={user.name ?? user.email ?? "Administrator"}
      roleLabel="Administrator"
    >
      {children}
    </AppShell>
  );
}
