"use client";

import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Me } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = { owner: "Chủ doanh nghiệp", staff: "Nhân viên" };

export function roleLabel(me: Me): string {
  if (me.currentTenant) return roleLabels[me.currentTenant.role] ?? me.currentTenant.role;
  return me.isSuperAdmin ? "Quản trị hệ thống" : "";
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words.at(-2)?.[0] ?? "") + (words.at(-1)?.[0] ?? "")).toUpperCase() || "?";
}

/** Logo + tên sản phẩm Remi (design.md § Thương hiệu). `compact`: chỉ logo + chữ, không dòng mô tả. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Remi — về trang Tổng quan"
      className={cn("flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", className)}
    >
      <LogoMark size={28} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <Wordmark className="text-[19px]" />
        {!compact && <span className="truncate text-xs text-muted-foreground">Giữ khách như người quen</span>}
      </span>
    </Link>
  );
}

/** Doanh nghiệp đang làm việc. Thuộc nhiều doanh nghiệp thì chọn được ngay tại đây. */
export function TenantSwitcher({ me, busy, onSwitch }: { me: Me; busy: boolean; onSwitch: (tenantId: string) => void }) {
  const tenant = me.currentTenant;
  if (!tenant) return null;
  const active = me.tenants.filter((t) => t.isActive);

  if (active.length > 1) {
    return (
      <Select value={tenant.id} onValueChange={onSwitch} disabled={busy}>
        <SelectTrigger className="h-auto min-h-11 w-full gap-2.5 rounded-lg bg-card py-2" aria-label="Chọn doanh nghiệp">
          <TenantAvatar name={tenant.name} />
          <span className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className="text-[11px] font-medium text-muted-foreground">Doanh nghiệp</span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {active.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-card px-2.5 py-1.5">
      <TenantAvatar name={tenant.name} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] font-medium text-muted-foreground">Doanh nghiệp</span>
        <span className="truncate text-sm font-medium">{tenant.name}</span>
      </span>
    </div>
  );
}

function TenantAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground" aria-hidden>
      {name.trim() ? <span className="text-xs font-semibold">{initials(name)}</span> : <Building2 className="size-4" />}
    </span>
  );
}

/** Người đang đăng nhập: bấm tên để vào Tài khoản (đổi mật khẩu), nút bên phải để đăng xuất. */
export function UserCard({ me, busy, onLogout }: { me: Me; busy: boolean; onLogout: () => void }) {
  const role = roleLabel(me);
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        title="Tài khoản, đổi mật khẩu"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white" aria-hidden>
          {initials(me.name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">{me.name}</span>
          {role && <span className="truncate text-xs text-muted-foreground">{role}</span>}
        </span>
      </Link>
      <Button variant="ghost" size="icon" onClick={onLogout} disabled={busy} aria-label="Đăng xuất" title="Đăng xuất" className="shrink-0 text-muted-foreground">
        <LogOut />
      </Button>
    </div>
  );
}

/** Số trên mục menu (khách đang chờ, cần chăm sóc). Đọc kèm nhãn cho trình đọc màn hình. */
export function CountBadge({ count, label, className }: { count: number; label: string; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground", className)}>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
