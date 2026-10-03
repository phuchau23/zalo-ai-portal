"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tổng quan" },
  { href: "/knowledge", label: "Kho kiến thức" },
  { href: "/settings", label: "Cài đặt" },
] as const;

const roleLabels: Record<string, string> = { owner: "Chủ doanh nghiệp", staff: "Nhân viên" };

export function AppShell({ children }: { children: ReactNode }) {
  const { me, reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  const activeTenants = me.tenants.filter((t) => t.isActive);

  async function switchTenant(tenantId: string) {
    setBusy(true);
    const result = await call(() => api.POST("/auth/switch-tenant", { body: { tenantId } }));
    if (result.ok) {
      await reload();
      router.refresh();
    }
    setBusy(false);
  }

  async function logout() {
    setBusy(true);
    await call(() => api.POST("/auth/logout"));
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3">
        <span className="font-semibold">Trợ lý Zalo AI</span>

        {activeTenants.length > 1 && me.currentTenant ? (
          <Select value={me.currentTenant.id} onValueChange={(id) => void switchTenant(id)} disabled={busy}>
            <SelectTrigger className="w-56" aria-label="Chọn doanh nghiệp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeTenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          me.currentTenant && <span className="text-sm text-muted-foreground">{me.currentTenant.name}</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm">
            {me.name}
            {me.currentTenant && (
              <span className="text-muted-foreground"> · {roleLabels[me.currentTenant.role] ?? me.currentTenant.role}</span>
            )}
            {me.isSuperAdmin && <span className="text-muted-foreground"> · Super admin</span>}
          </span>
          <Button variant="outline" size="sm" onClick={() => void logout()} disabled={busy}>
            Đăng xuất
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="flex gap-1 border-b bg-background p-2 md:w-52 md:flex-col md:border-r md:border-b-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-muted",
                (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) && "bg-muted font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
          {me.isSuperAdmin && (
            // Trang của BE (qua rewrite), không phải trang Next.js, nên dùng <a>.
            <a href="/hangfire" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
              Hàng đợi job
            </a>
          )}
        </nav>

        <main className="flex-1 p-4 md:p-6">{me.currentTenant ? children : <NoTenantNotice />}</main>
      </div>
    </div>
  );
}

function NoTenantNotice() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Chưa có doanh nghiệp đang hoạt động</CardTitle>
        <CardDescription>
          Tài khoản của bạn chưa thuộc doanh nghiệp nào, hoặc doanh nghiệp đã bị tạm khóa. Liên hệ quản trị viên để
          được thêm vào doanh nghiệp.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
