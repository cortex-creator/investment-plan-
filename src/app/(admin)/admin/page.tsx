import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import {
  adjustBalance,
  createMarketEvent,
  sendNotification,
  togglePlan,
  updateInvestment,
  updatePlan,
  updateSetting,
  updateTransactionStatus,
  updateUser,
  upsertAsset,
} from "./actions";

function Field({ name, value, type = "text", step, min }: { name: string; value?: string | number; type?: string; step?: string; min?: string }) {
  return (
    <input
      name={name}
      defaultValue={value}
      type={type}
      step={step}
      min={min}
      className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand"
    />
  );
}

export default async function AdminPage() {
  await requireAdmin();

  const [users, plans, transactions, investments, assets, settings, counts] = await Promise.all([
    prisma.user.findMany({ include: { role: true, portfolio: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.investmentPlan.findMany({ orderBy: { minAmount: "asc" } }),
    prisma.transaction.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.userInvestment.findMany({ include: { user: true, plan: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.asset.findMany({ orderBy: { symbol: "asc" } }),
    prisma.platformSetting.findMany({ orderBy: { key: "asc" } }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.userInvestment.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.count({ where: { status: "PENDING" } }),
      prisma.investmentPlan.count({ where: { isActive: true } }),
      prisma.asset.count({ where: { isActive: true } }),
      prisma.portfolio.aggregate({ _sum: { cashBalance: true, totalDeposited: true, totalInvested: true, totalReturns: true } }),
    ]),
  ]);

  const [userCount, activeUsers, activeInvestments, pendingTransactions, activePlans, activeAssets, money] = counts;
  const recentUsers = users.slice(0, 10);
  const recentTransactions = transactions.slice(0, 12);
  const recentInvestments = investments.slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Administration</h1>
        <p className="text-sm text-muted">Central control panel for users, money movement, investments, plans, market data, notifications and platform settings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Users", userCount],
          ["Active users", activeUsers],
          ["Active investments", activeInvestments],
          ["Pending transactions", pendingTransactions],
          ["Active plans", activePlans],
          ["Active assets", activeAssets],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Cash across portfolios", money._sum.cashBalance],
          ["Total deposited", money._sum.totalDeposited],
          ["Total invested", money._sum.totalInvested],
          ["Total returns", money._sum.totalReturns],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(toNumber(value as any))}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>User management</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs text-muted"><th className="py-2">User</th><th>Role</th><th>Balance</th><th>Status</th><th>Access</th><th>Balance control</th></tr></thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 align-top">
                    <td className="py-3"><p className="font-medium text-foreground">{user.name}</p><p className="text-xs text-muted">{user.email}</p></td>
                    <td>{user.role.name}</td>
                    <td>{formatCurrency(toNumber(user.portfolio?.cashBalance ?? 0))}</td>
                    <td>{user.isActive ? "Active" : "Disabled"}</td>
                    <td>
                      <form action={updateUser} className="flex gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <select name="active" defaultValue={String(user.isActive)} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                          <option value="true">Active</option><option value="false">Disabled</option>
                        </select>
                        <select name="role" defaultValue={user.role.name} className="h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                          <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                        </select>
                        <Button size="sm" type="submit">Save</Button>
                      </form>
                    </td>
                    <td>
                      <form action={adjustBalance} className="grid grid-cols-4 gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select name="type" className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"><option value="DEPOSIT">Credit</option><option value="WITHDRAWAL">Debit</option></select>
                        <Field name="amount" type="number" step="0.01" min="0.01" />
                        <Field name="description" value="Admin adjustment" />
                        <Button size="sm" type="submit">Apply</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Investment plan control</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-medium text-foreground">{plan.name}</p><p className="text-xs text-muted">{plan.slug} · {plan.isActive ? "Active" : "Inactive"}</p></div>
                  <form action={togglePlan}><input type="hidden" name="id" value={plan.id} /><Button size="sm" variant={plan.isActive ? "danger" : "secondary"} type="submit">{plan.isActive ? "Disable plan" : "Enable plan"}</Button></form>
                </div>
                <form action={updatePlan} className="grid gap-3 md:grid-cols-5">
                  <input type="hidden" name="id" value={plan.id} />
                  <label className="text-xs text-muted">Min<input className="mt-1" /></label>
                  <div><p className="text-xs text-muted">Minimum amount</p><Field name="minAmount" value={toNumber(plan.minAmount)} type="number" step="0.01" min="0" /></div>
                  <div><p className="text-xs text-muted">Maximum amount</p><Field name="maxAmount" value={plan.maxAmount ? toNumber(plan.maxAmount) : ""} type="number" step="0.01" min="0" /></div>
                  <div><p className="text-xs text-muted">Return %</p><Field name="returnRate" value={plan.returnRateBps / 100} type="number" step="0.01" min="0" /></div>
                  <div><p className="text-xs text-muted">Duration days</p><Field name="durationDays" value={plan.durationDays} type="number" step="1" min="1" /></div>
                  <div className="md:col-span-4"><p className="text-xs text-muted">Description</p><Field name="description" value={plan.description} /></div>
                  <div className="flex items-end"><Button type="submit" className="w-full">Save plan</Button></div>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transaction control</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs text-muted"><th className="py-2">Date</th><th>User</th><th>Type</th><th>Amount</th><th>Reference</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>{recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60">
                  <td className="py-3">{formatDateTime(tx.createdAt)}</td><td>{tx.user.name}<div className="text-xs text-muted">{tx.user.email}</div></td><td>{tx.type}</td><td>{formatCurrency(tx.amount)}</td><td className="text-xs">{tx.reference ?? "—"}</td>
                  <td>{tx.status}</td>
                  <td><form action={updateTransactionStatus} className="flex gap-2"><input type="hidden" name="id" value={tx.id}/><select name="status" defaultValue={tx.status} className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"><option>PENDING</option><option>COMPLETED</option><option>FAILED</option></select><Button size="sm" type="submit">Update</Button></form></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Investment control</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs text-muted"><th className="py-2">User</th><th>Plan</th><th>Principal</th><th>Current value</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>{recentInvestments.map((investment) => (
                <tr key={investment.id} className="border-b border-border/60">
                  <td className="py-3">{investment.user.name}<div className="text-xs text-muted">{investment.user.email}</div></td><td>{investment.plan.name}</td><td>{formatCurrency(investment.principal)}</td>
                  <td><form action={updateInvestment} className="flex gap-2"><input type="hidden" name="id" value={investment.id}/><Field name="currentValue" value={toNumber(investment.currentValue)} type="number" step="0.01" min="0"/><select name="status" defaultValue={investment.status} className="h-9 rounded-lg border border-border bg-surface px-2 text-xs"><option>ACTIVE</option><option>COMPLETED</option><option>CANCELLED</option></select><Button size="sm" type="submit">Save</Button></form></td>
                  <td>{investment.status}</td><td>{formatDateTime(investment.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Market asset control</CardTitle></CardHeader>
          <CardContent>
            <form action={upsertAsset} className="mb-5 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-5">
              <div><p className="text-xs text-muted">Symbol</p><Field name="symbol" /></div>
              <div><p className="text-xs text-muted">Name</p><Field name="name" /></div>
              <div><p className="text-xs text-muted">Type</p><select name="type" className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"><option>STOCK</option><option>CRYPTO</option><option>COMMODITY</option><option>INDEX</option><option>FOREX</option></select></div>
              <div><p className="text-xs text-muted">Price</p><Field name="price" type="number" step="0.0001" min="0" /></div>
              <div className="flex items-end"><input type="hidden" name="active" value="true"/><Button type="submit" className="w-full">Create asset</Button></div>
            </form>
            <div className="space-y-3">{assets.map((asset) => (
              <form key={asset.id} action={upsertAsset} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-6">
                <input type="hidden" name="id" value={asset.id}/>
                <div><p className="text-xs text-muted">Symbol</p><Field name="symbol" value={asset.symbol}/></div>
                <div><p className="text-xs text-muted">Name</p><Field name="name" value={asset.name}/></div>
                <div><p className="text-xs text-muted">Type</p><select name="type" defaultValue={asset.type} className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"><option>STOCK</option><option>CRYPTO</option><option>COMMODITY</option><option>INDEX</option><option>FOREX</option></select></div>
                <div><p className="text-xs text-muted">Price</p><Field name="price" value={toNumber(asset.price)} type="number" step="0.0001" min="0"/></div>
                <div><p className="text-xs text-muted">Status</p><select name="active" defaultValue={String(asset.isActive)} className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"><option value="true">Active</option><option value="false">Disabled</option></select></div>
                <div className="flex items-end"><Button size="sm" type="submit" className="w-full">Save</Button></div>
              </form>
            ))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Market events</CardTitle></CardHeader>
          <CardContent>
            <form action={createMarketEvent} className="space-y-3">
              <Field name="headline" />
              <textarea name="description" placeholder="Description" className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"/>
              <div className="grid grid-cols-2 gap-3">
                <select name="category" className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"><option>PLATFORM_NEWS</option><option>PRICE_MOVE</option><option>RATE_CHANGE</option><option>ACCOUNT_ACTIVITY</option></select>
                <select name="assetId" className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"><option value="">Platform-wide</option>{assets.map(a=><option key={a.id} value={a.id}>{a.symbol}</option>)}</select>
              </div>
              <Button type="submit">Publish event</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Platform settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {settings.map((setting) => (
              <form key={setting.key} action={updateSetting} className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                <input type="hidden" name="key" value={setting.key}/>
                <div><p className="font-medium text-sm text-foreground">{setting.key}</p><p className="text-xs text-muted">{setting.description ?? "Admin-managed setting"}</p></div>
                <Field name="value" value={setting.value}/>
                <Button size="sm" type="submit">Save</Button>
              </form>
            ))}
            {settings.length === 0 && <p className="text-sm text-muted">No settings have been created yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Send user notification</CardTitle></CardHeader>
          <CardContent>
            <form action={sendNotification} className="space-y-3">
              <select name="userId" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm">{users.map(u=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select>
              <Field name="title" />
              <textarea name="message" placeholder="Message" className="min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"/>
              <select name="type" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"><option>INFO</option><option>SUCCESS</option><option>WARNING</option><option>MARKET</option></select>
              <Button type="submit">Send notification</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
