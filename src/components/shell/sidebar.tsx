"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Me } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { isActive, type NavBadge, type NavGroup, type NavItem } from "./nav-config";
import { Brand, CountBadge, TenantSwitcher, UserCard } from "./shell-parts";

export const badgeLabels: Record<NavBadge, string> = { inbox: "khách đang chờ nhân viên", care: "khách cần chăm sóc" };

/** Thanh bên (máy tính, từ md): nhóm menu có nhãn, mục đang mở tô nền + vạch màu bên trái. */
export function Sidebar({
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
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-2">
        <Brand />
        <TenantSwitcher me={me} busy={busy} onSwitch={onSwitchTenant} />
      </div>

      <nav aria-label="Menu chính" className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 pt-1.5 pb-3">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-px">
            {group.label && (
              <p className="mb-0.5 flex items-center gap-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.ai && <Sparkles className="size-3 text-ai" aria-hidden />}
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} count={item.badge ? counts[item.badge] : 0} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t px-3 py-2">
        {settings && <SidebarLink item={settings} active={isActive(pathname, settings.href)} count={0} />}
        <UserCard me={me} busy={busy} onLogout={onLogout} />
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  const className = cn(
    "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-sidebar-primary"
      : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
  );
  const content = (
    <>
      <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
      <span className="truncate">{item.label}</span>
      <CountBadge count={count} label={item.badge ? badgeLabels[item.badge] : ""} className="ml-auto" />
    </>
  );
  return item.external ? (
    <a href={item.href} className={className} title={item.description}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={className} title={item.description} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
