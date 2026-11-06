"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { BotMessageSquare, Building2, Check, ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, Sparkles, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Me } from "@/lib/api/client";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isActive, type NavBadge, type NavGroup, type NavItem } from "./nav-config";
import { initials, roleLabel } from "./shell-parts";

export const badgeLabels: Record<NavBadge, string> = { inbox: "khách đang chờ nhân viên", care: "khách cần chăm sóc" };

/** Bề rộng thanh bên: mở rộng / thu gọn (chỉ còn biểu tượng). */
const fullWidth = 264;
const railWidth = 76;
/** Rê chuột lâu hơn mức này mới mở rộng, tránh bung ra khi chỉ lướt chuột qua. */
const peekDelayMs = 140;

type SidebarProps = {
  me: Me;
  groups: NavGroup[];
  settings: NavItem | null;
  pathname: string;
  counts: Record<NavBadge, number>;
  busy: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSwitchTenant: (tenantId: string) => void;
  onLogout: () => void;
};

/**
 * Thanh bên (máy tính, từ md), nền trắng, xanh Zalo chỉ làm điểm nhấn.
 * - Thu gọn được thành dải biểu tượng (nút ghim hoặc Ctrl+B, nhớ trên máy này). Khi thu gọn, rê chuột hoặc dùng phím Tab vào
 *   thì thanh bên mở rộng đè lên nội dung (không đẩy trang), rời ra thì thu lại.
 * - Mục đang mở có nền dải màu; nền này trượt sang mục mới khi chuyển trang (motion `layoutId`).
 * - Chữ của mục luôn nằm trong cây truy cập (chỉ mờ đi khi thu gọn) nên trình đọc màn hình vẫn đọc đúng tên.
 */
export function Sidebar({ me, groups, settings, pathname, counts, busy, collapsed, onToggleCollapsed, onSwitchTenant, onLogout }: SidebarProps) {
  const [peek, setPeek] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = !collapsed || peek || menuOpen;

  useEffect(() => () => clearPeekTimer(), []);

  function clearPeekTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function onEnter() {
    if (!collapsed) return;
    clearPeekTimer();
    timer.current = setTimeout(() => setPeek(true), peekDelayMs);
  }

  function onLeave() {
    clearPeekTimer();
    setPeek(false);
  }

  // Chỉ mở rộng khi tới bằng bàn phím; focus do menu trả về sau khi bấm chuột thì không.
  function onFocus(event: FocusEvent<HTMLElement>) {
    if (collapsed && event.target instanceof HTMLElement && event.target.matches(":focus-visible")) setPeek(true);
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPeek(false);
  }

  function toggle() {
    setPeek(false);
    onToggleCollapsed();
  }

  return (
    <>
      {/* Giữ chỗ cho thanh bên (thanh bên nằm cố định để khi mở rộng tạm thời thì đè lên nội dung). */}
      <motion.div aria-hidden className="hidden shrink-0 md:block" initial={false} animate={{ width: collapsed ? railWidth : fullWidth }} transition={spring} />

      <motion.aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-shell-gradient text-shell-foreground md:flex"
        initial={false}
        animate={{
          width: open ? fullWidth : railWidth,
          boxShadow: collapsed && open ? "16px 0 40px -12px rgb(15 23 42 / 0.18)" : "0 0 0 0 rgb(0 0 0 / 0)",
        }}
        transition={spring}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {/* Ánh sáng trang trí phía sau. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 size-80 rounded-full bg-primary/[0.07] blur-3xl" />
        </div>

        <div className="relative flex h-[72px] shrink-0 items-center gap-2 pr-3 pl-[18px]">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-active-gradient text-white shadow-glow">
              <BotMessageSquare className="size-5" aria-hidden />
            </span>
            <Reveal open={open} className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">Trợ lý Zalo AI</span>
              <span className="truncate text-xs text-shell-muted">CRM & chăm sóc khách</span>
            </Reveal>
          </Link>
          <Reveal open={open}>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Ghim menu ở dạng mở rộng" : "Thu gọn menu"}
              title={`${collapsed ? "Ghim menu mở rộng" : "Thu gọn menu"} (Ctrl+B)`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-shell-muted transition-colors hover:bg-shell-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
            </button>
          </Reveal>
        </div>

        <TenantMenu me={me} open={open} busy={busy} onSwitch={onSwitchTenant} onOpenChange={setMenuOpen} />

        <nav aria-label="Menu chính" className="scrollbar-thin relative flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-3 pt-3 pb-3">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-0.5">
              {group.label && (
                <div className="relative flex h-6 items-center px-[17px]">
                  <Reveal open={open} className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider whitespace-nowrap text-shell-muted uppercase">
                    {group.ai && <Sparkles className="size-3" aria-hidden />}
                    {group.label}
                  </Reveal>
                  <motion.span
                    aria-hidden
                    className="absolute left-[14px] h-px w-6 bg-shell-border"
                    initial={false}
                    animate={{ opacity: open ? 0 : 1 }}
                  />
                </div>
              )}
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} open={open} active={isActive(pathname, item.href)} count={item.badge ? counts[item.badge] : 0} />
              ))}
            </div>
          ))}
        </nav>

        <div className="relative flex flex-col gap-1 border-t border-shell-border px-3 py-3">
          {settings && <SidebarLink item={settings} open={open} active={isActive(pathname, settings.href)} count={0} />}
          <UserMenu me={me} open={open} busy={busy} onLogout={onLogout} onOpenChange={setMenuOpen} />
        </div>
      </motion.aside>
    </>
  );
}

/** Chữ hiện dần khi thanh bên mở rộng, mờ đi khi thu gọn (vẫn trong cây truy cập). */
function Reveal({ open, className, children }: { open: boolean; className?: string; children: ReactNode }) {
  return (
    <motion.span
      className={cn("min-w-0", className)}
      initial={false}
      animate={{ opacity: open ? 1 : 0, x: open ? 0 : -4 }}
      transition={{ duration: open ? 0.2 : 0.1, delay: open ? 0.06 : 0 }}
    >
      {children}
    </motion.span>
  );
}

function SidebarLink({ item, open, active, count }: { item: NavItem; open: boolean; active: boolean; count: number }) {
  const Icon = item.icon;
  const className = cn(
    "group relative flex h-9 shrink-0 items-center gap-3 rounded-xl pr-3 pl-[17px] text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
    active ? "font-semibold text-primary" : "text-shell-foreground hover:bg-shell-accent hover:text-foreground",
  );
  const content = (
    <>
      {active && (
        <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-primary/[0.09] ring-1 ring-primary/10 ring-inset" transition={spring}>
          <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" />
        </motion.span>
      )}
      <span className="relative flex shrink-0">
        <Icon className={cn("size-[18px] transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none", active ? "text-primary" : "text-shell-muted group-hover:text-foreground")} aria-hidden />
        {count > 0 && !open && <span className="absolute -top-1 -right-1.5 size-2.5 rounded-full bg-warning ring-2 ring-shell" aria-hidden />}
      </span>
      <Reveal open={open} className="relative flex-1 truncate">
        {item.label}
      </Reveal>
      {count > 0 && (
        <Reveal open={open} className="relative">
          <span
            className={cn(
              "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
              "bg-primary text-primary-foreground",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
          <span className="sr-only"> {item.badge ? badgeLabels[item.badge] : ""}</span>
        </Reveal>
      )}
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

/** Doanh nghiệp đang làm việc. Thuộc nhiều doanh nghiệp thì bấm để đổi. */
function TenantMenu({
  me,
  open,
  busy,
  onSwitch,
  onOpenChange,
}: {
  me: Me;
  open: boolean;
  busy: boolean;
  onSwitch: (tenantId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const tenant = me.currentTenant;
  if (!tenant) return null;
  const active = me.tenants.filter((t) => t.isActive);
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
        {tenant.name.trim() ? <span className="text-xs font-semibold">{initials(tenant.name)}</span> : <Building2 className="size-4" />}
      </span>
      <Reveal open={open} className="flex flex-1 flex-col text-left leading-tight">
        <span className="text-[11px] font-medium text-shell-muted">Doanh nghiệp</span>
        <span className="truncate text-sm font-medium text-foreground">{tenant.name}</span>
      </Reveal>
      {active.length > 1 && (
        <Reveal open={open}>
          <ChevronsUpDown className="size-4 text-shell-muted" aria-hidden />
        </Reveal>
      )}
    </>
  );
  const boxClass = "relative mx-3 flex h-[54px] shrink-0 items-center gap-3 rounded-xl border border-shell-border bg-shell-accent pr-3 pl-[5px]";

  if (active.length <= 1) return <div className={boxClass}>{body}</div>;

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label={`Doanh nghiệp: ${tenant.name}. Bấm để đổi`}
        className={cn(boxClass, "cursor-pointer transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none")}
      >
        {body}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-64">
        <DropdownMenuLabel>Chuyển doanh nghiệp</DropdownMenuLabel>
        {active.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => t.id !== tenant.id && onSwitch(t.id)} className="min-h-10 cursor-pointer">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-semibold text-accent-foreground" aria-hidden>
              {initials(t.name)}
            </span>
            <span className="flex-1 truncate">{t.name}</span>
            {t.id === tenant.id && <Check className="text-primary" aria-label="Đang chọn" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Người đang đăng nhập: bấm để mở menu Tài khoản / Đăng xuất. */
function UserMenu({
  me,
  open,
  busy,
  onLogout,
  onOpenChange,
}: {
  me: Me;
  open: boolean;
  busy: boolean;
  onLogout: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const role = roleLabel(me);
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label={`Tài khoản: ${me.name}`}
        className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl pr-3 pl-[11px] text-left transition-colors hover:bg-shell-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full bg-active-gradient text-[11px] font-semibold text-white ring-2 ring-background" aria-hidden>
          {initials(me.name)}
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-shell" />
        </span>
        <Reveal open={open} className="flex flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">{me.name}</span>
          {role && <span className="truncate text-xs text-shell-muted">{role}</span>}
        </Reveal>
        <Reveal open={open}>
          <ChevronsUpDown className="size-4 text-shell-muted" aria-hidden />
        </Reveal>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">{me.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
          <Link href="/account">
            <UserRound aria-hidden />
            Tài khoản & mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={busy} onSelect={onLogout} className="min-h-10 cursor-pointer">
          <LogOut aria-hidden />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
