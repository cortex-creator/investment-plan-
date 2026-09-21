import { auth } from "@/auth";
import { AppShell, type NavItem } from "@/components/nav/AppShell";

const navItems: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/plans", label: "Investment Plans" },
  { href: "/admin/assets", label: "Asset Prices" },
  { href: "/admin/market-events", label: "Market Activity" },
  { href: "/admin/transactions", label: "Transactions & Deposits" },
  { href: "/admin/settings", label: "Platform Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const admin = session?.user ?? { name: "Administrator", email: "Administrator" };

  return (
    <AppShell
      navItems={navItems}
      brandLabel="Vantage Admin"
      userName={admin.name ?? admin.email ?? "Admin"}
      roleLabel="Administrator"
    >
      {children}
    </AppShell>
  );
}
