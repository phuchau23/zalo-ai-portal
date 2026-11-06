"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { LayoutGrid, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Me } from "@/lib/api/client";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isActive, mobilePrimary, type NavBadge, type NavGroup, type NavItem } from "./nav-config";
import { Brand, CountBadge, TenantSwitcher, UserCard, initials } from "./shell-parts";
import { badgeLabels } from "./sidebar";

/** Thanh trên (điện thoại): logo + doanh nghiệp, ảnh đại diện mở trang Tài khoản. */
export function MobileTopBar({ me }: { me: Me }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur-xl supports-backdrop-filter:bg-card/70 md:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Brand compact className="min-w-0 flex-1" />
        {me.currentTenant && <span className="max-w-[40%] truncate text-xs font-medium text-muted-foreground">{me.currentTenant.name}</span>}
        <Link
          href="/account"
          aria-label="Tài khoản, đổi mật khẩu"
          className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">{initials(me.name)}</span>
        </Link>
      </div>
    </header>
  );
}

/**
 * Thanh dưới cùng (điện thoại): 4 mục hay dùng + "Thêm" (mở toàn bộ menu dạng tấm trượt lên).
 * Mục đang mở tô màu chính + vạch trên; số khách chờ hiện trên biểu tượng.
 */
export function MobileTabBar({
  me,
  groups,
  settings,
  pathname,
  counts,
  busy,
  onSwitchTenant,
  onLogout,
}: {
  me: Me;
  groups: NavGroup[];
  settings: NavItem | null;
  pathname: string;
  counts: Record<NavBadge, number>;
  busy: boolean;
  onSwitchTenant: (tenantId: string) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const primary = mobilePrimary(groups);
  const primaryActive = primary.some((i) => isActive(pathname, i.href));
  const moreCount = groups
    .flatMap((g) => g.items)
    .filter((i) => i.badge && !primary.includes(i))
    .reduce((sum, i) => sum + (i.badge ? counts[i.badge] : 0), 0);

  return (
    <>
      <nav
        aria-label="Menu nhanh"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-float backdrop-blur-xl supports-backdrop-filter:bg-card/75 md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {primary.map((item) => (
            <li key={item.href} className="flex-1">
              <TabLink item={item} active={isActive(pathname, item.href)} count={item.badge ? counts[item.badge] : 0} />
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
                !primaryActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative flex h-8 w-14 items-center justify-center">
                {!primaryActive && <motion.span layoutId="mobile-tab-active" className="absolute inset-0 rounded-full bg-accent" transition={spring} />}
                <LayoutGrid className="relative size-[22px]" aria-hidden />
                {moreCount > 0 && <span className="absolute top-0.5 right-3 size-2.5 rounded-full bg-primary ring-2 ring-card" aria-hidden />}
              </span>
              Thêm
              {moreCount > 0 && <span className="sr-only">, có {moreCount} việc đang chờ</span>}
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-auto bottom-0 left-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 gap-5 overflow-y-auto rounded-t-2xl rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-none data-open:slide-in-from-bottom-8 data-open:zoom-in-100 data-closed:slide-out-to-bottom-8 data-closed:zoom-out-100"
        >
          <div className="mx-auto -mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold">Tất cả chức năng</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Chọn việc bạn muốn làm. Mỗi mục có một dòng giải thích ngắn.
            </DialogDescription>
          </div>
          <TenantSwitcher me={me} busy={busy} onSwitch={onSwitchTenant} />
          {groups.map((group) => (
            <section key={group.id} className="flex flex-col gap-2" aria-label={group.label ?? "Trang chính"}>
              {group.label && (
                <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.ai && <Sparkles className="size-3 text-ai" aria-hidden />}
                  {group.label}
                </h3>
              )}
              <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SheetLink item={item} active={isActive(pathname, item.href)} count={item.badge ? counts[item.badge] : 0} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {settings && (
            <SheetLink item={settings} active={isActive(pathname, settings.href)} count={0} onNavigate={() => setOpen(false)} />
          )}
          <div className="border-t pt-3">
            <UserCard me={me} busy={busy} onLogout={onLogout} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative flex h-8 w-14 items-center justify-center">
        {active && <motion.span layoutId="mobile-tab-active" className="absolute inset-0 rounded-full bg-accent" transition={spring} />}
        <Icon className="relative size-[22px]" aria-hidden />
        <CountBadge count={count} label={item.badge ? badgeLabels[item.badge] : ""} className="absolute -top-1 right-1 h-4 min-w-4 px-1 text-[10px] ring-2 ring-card" />
      </span>
      <span className="max-w-full truncate px-1">{item.label}</span>
    </Link>
  );
}

function SheetLink({ item, active, count, onNavigate }: { item: NavItem; active: boolean; count: number; onNavigate: () => void }) {
  const Icon = item.icon;
  const className = cn(
    "flex min-h-14 items-start gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    active ? "border-primary/40 bg-accent" : "bg-card hover:bg-muted",
  );
  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {item.label}
          <CountBadge count={count} label={item.badge ? badgeLabels[item.badge] : ""} />
        </span>
        <span className="text-xs leading-snug text-muted-foreground">{item.description}</span>
      </span>
    </>
  );
  return item.external ? (
    <a href={item.href} className={className} onClick={onNavigate}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={className} onClick={onNavigate} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
