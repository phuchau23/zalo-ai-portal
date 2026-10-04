"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Building2, Database, HeartHandshake, House, Inbox, ListChecks, LogOut, MessagesSquare, Plug, Settings, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/states";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; external?: boolean; badge?: number };

const navItems: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: House },
  { href: "/inbox", label: "Hộp thư", icon: Inbox },
  { href: "/care", label: "Cần chăm sóc", icon: HeartHandshake },
  { href: "/customers", label: "Khách hàng", icon: Users },
  { href: "/knowledge", label: "Kho kiến thức", icon: Database },
  { href: "/chat-test", label: "Chat thử", icon: MessagesSquare },
  { href: "/channels", label: "Kết nối kênh", icon: Plug },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

const roleLabels: Record<string, string> = { owner: "Chủ doanh nghiệp", staff: "Nhân viên" };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words.at(-2)?.[0] ?? "") + (words.at(-1)?.[0] ?? "")).toUpperCase() || "?";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  const careCount = useCareCount(me.currentTenant?.id);
  const activeTenants = me.tenants.filter((t) => t.isActive);
  const items: NavItem[] = me.isSuperAdmin
    ? // Trang của BE (qua rewrite), không phải trang Next.js, nên dùng <a>.
      [...navItems, { href: "/hangfire", label: "Hàng đợi job", icon: ListChecks, external: true }]
    : navItems;
  const withBadges = items.map((item) => (item.href === "/care" ? { ...item, badge: careCount } : item));
  const role = me.currentTenant ? (roleLabels[me.currentTenant.role] ?? me.currentTenant.role) : me.isSuperAdmin ? "Super admin" : "";

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

  const tenantPicker =
    activeTenants.length > 1 && me.currentTenant ? (
      <Select value={me.currentTenant.id} onValueChange={(id) => void switchTenant(id)} disabled={busy}>
        <SelectTrigger className="w-full bg-background" aria-label="Chọn doanh nghiệp">
          <Building2 className="text-muted-foreground" aria-hidden />
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
      me.currentTenant && (
        <div className="flex items-center gap-2 px-1 text-sm">
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{me.currentTenant.name}</span>
        </div>
      )
    );

  return (
    <div className="flex min-h-svh flex-1 flex-col md:flex-row">
      {/* Thanh bên (máy tính) */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <Brand className="h-14 border-b px-4" />
        <div className="border-b p-3">{tenantPicker}</div>
        <nav aria-label="Menu chính" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {withBadges.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t p-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
            aria-hidden
          >
            {initials(me.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{me.name}</span>
            {role && <span className="truncate text-xs text-muted-foreground">{role}</span>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => void logout()} disabled={busy} aria-label="Đăng xuất" title="Đăng xuất">
            <LogOut />
          </Button>
        </div>
      </aside>

      {/* Thanh trên (điện thoại) */}
      <header className="sticky top-0 z-20 border-b bg-background md:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Brand />
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void logout()} disabled={busy}>
            <LogOut aria-hidden />
            Đăng xuất
          </Button>
        </div>
        {me.currentTenant && <div className="px-4 pb-2">{tenantPicker}</div>}
        <nav aria-label="Menu chính" className="flex overflow-x-auto px-2">
          {withBadges.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const className = cn(
              "relative flex h-11 shrink-0 items-center gap-1.5 px-3 text-sm whitespace-nowrap text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active && "font-medium text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary",
            );
            const content = (
              <>
                <Icon className="size-4" aria-hidden />
                {item.label}
                <NavBadge count={item.badge} />
              </>
            );
            return item.external ? (
              <a key={item.href} href={item.href} className={className}>
                {content}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={className} aria-current={active ? "page" : undefined}>
                {content}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
          {me.currentTenant ? (
            children
          ) : (
            <EmptyState
              icon={Building2}
              title="Chưa có doanh nghiệp đang hoạt động"
              description="Tài khoản của bạn chưa thuộc doanh nghiệp nào, hoặc doanh nghiệp đã bị tạm khóa. Liên hệ quản trị viên để được thêm vào doanh nghiệp."
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <MessagesSquare className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">Trợ lý Zalo AI</span>
    </Link>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const className = cn(
    "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    active &&
      "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-r-sm before:bg-sidebar-primary",
  );
  const content = (
    <>
      <Icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground")} aria-hidden />
      {item.label}
      <NavBadge count={item.badge} className="ml-auto" />
    </>
  );

  return item.external ? (
    <a href={item.href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

/** Số gợi ý "Cần chăm sóc" đang mở; tải lại mỗi phút. */
function useCareCount(tenantId: string | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const load = async () => {
      const result = await call(() => api.GET("/care/count"));
      if (!cancelled && result.ok) setCount(result.data.open);
    };
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tenantId]);
  return count;
}

function NavBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("tabular rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground", className)}>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> khách cần chăm sóc</span>
    </span>
  );
}
