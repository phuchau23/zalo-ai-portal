"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  Gauge,
  Database,
  HeartHandshake,
  House,
  Inbox,
  ListChecks,
  LogOut,
  MessagesSquare,
  Plug,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/states";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { expiryState, formatVnDate } from "@/lib/admin";
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
    ? [
        ...(me.currentTenant ? navItems : []),
        { href: "/admin", label: "Quản trị hệ thống", icon: ShieldCheck },
        // Trang của BE (qua rewrite), không phải trang Next.js, nên dùng <a>.
        { href: "/hangfire", label: "Hàng đợi job", icon: ListChecks, external: true },
      ]
    : navItems;
  // Trang /admin (super admin) và /account (đổi mật khẩu) không cần doanh nghiệp đang hoạt động.
  const adminArea = (me.isSuperAdmin && pathname.startsWith("/admin")) || pathname.startsWith("/account");
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
          <Link
            href="/account"
            title="Tài khoản, đổi mật khẩu"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-0.5 hover:bg-sidebar-accent/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
              aria-hidden
            >
              {initials(me.name)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{me.name}</span>
              {role && <span className="truncate text-xs text-muted-foreground">{role}</span>}
            </span>
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={() => void logout()} disabled={busy} aria-label="Đăng xuất" title="Đăng xuất">
            <LogOut />
          </Button>
        </div>
      </aside>

      {/* Thanh trên (điện thoại) */}
      <header className="sticky top-0 z-20 border-b bg-background md:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Brand />
          <Link
            href="/account"
            aria-label="Tài khoản, đổi mật khẩu"
            className="ml-auto flex size-11 items-center justify-center rounded-md text-xs font-semibold hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">{initials(me.name)}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void logout()} disabled={busy}>
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
          {adminArea ? (
            children
          ) : me.currentTenant ? (
            <>
              {me.currentTenant.role === "owner" && (
                <>
                  <ExpiryBanner expiresAt={me.currentTenant.expiresAt} />
                  <UsageBanner tenantId={me.currentTenant.id} />
                </>
              )}
              {children}
            </>
          ) : (
            <EmptyState
              icon={Building2}
              title="Chưa có doanh nghiệp đang hoạt động"
              description="Tài khoản của bạn chưa thuộc doanh nghiệp nào, hoặc doanh nghiệp đã bị tạm khóa. Liên hệ quản trị viên để được thêm vào doanh nghiệp."
            >
              {me.isSuperAdmin && (
                <Link href="/admin" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
                  Mở trang quản trị hệ thống
                </Link>
              )}
            </EmptyState>
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

/** Nhắc chủ DN gia hạn: từ 7 ngày trước hạn; quá hạn 3 ngày thì hệ thống tự khóa (BE: Billing). */
function ExpiryBanner({ expiresAt }: { expiresAt: string | null }) {
  const state = expiryState(expiresAt);
  if (state.kind === "none") return null;
  const date = formatVnDate(expiresAt);
  return (
    <div role="status" className="mb-6 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
      <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        {state.kind === "soon"
          ? `Gói thuê hết hạn ${state.daysLeft === 0 ? "hôm nay" : `sau ${state.daysLeft} ngày`} (${date}). Liên hệ để gia hạn, tránh bot ngừng trả lời khách.`
          : `Gói thuê đã hết hạn ngày ${date}. Quá hạn 3 ngày hệ thống sẽ tự tạm khóa, bot ngừng trả lời khách. Liên hệ để gia hạn.`}
      </p>
    </div>
  );
}

/** Cảnh báo hạn mức hội thoại tháng (từ 80%; hết → khách mới chuyển nhân viên). Tải lại mỗi 10 phút. */
function UsageBanner({ tenantId }: { tenantId: string }) {
  const [usage, setUsage] = useState<{ used: number; quota: number | null; warning: boolean; exceeded: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const result = await call(() => api.GET("/tenant/usage"));
      if (!cancelled && result.ok) setUsage(result.data);
    };
    void load();
    const timer = setInterval(() => void load(), 600_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tenantId]);
  if (!usage || !usage.warning || usage.quota === null) return null;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
        usage.exceeded ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      <Gauge className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        {usage.exceeded
          ? `Đã dùng hết ${usage.quota} hội thoại của tháng này. Khách mới nhắn sẽ được chuyển sang nhân viên trong Hộp thư (bot vẫn trả lời khách đã nhắn trong tháng). Liên hệ để nâng gói.`
          : `Đã dùng ${usage.used}/${usage.quota} hội thoại của tháng này. Khi hết, khách mới sẽ được chuyển sang nhân viên thay vì bot trả lời.`}
      </p>
    </div>
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
