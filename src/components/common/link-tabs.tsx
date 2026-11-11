"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type LinkTab = { href: string; label: string; icon?: LucideIcon; active: boolean; badge?: string };

/**
 * Hàng tab là ĐƯỜNG DẪN (mỗi tab một URL → gửi link được, nút Quay lại của trình duyệt hoạt động).
 * Cùng dáng `TabsList variant="pill"`: thẻ trắng, viên dải màu trượt sang tab đang chọn. Điện thoại: cuộn ngang.
 */
export function LinkTabs({ label, tabs, className }: { label: string; tabs: LinkTab[]; className?: string }) {
  const id = useId();
  const navRef = useRef<HTMLElement>(null);
  const activeHref = tabs.find((t) => t.active)?.href;

  // Điện thoại: hàng tab cuộn ngang → kéo tab đang chọn vào giữa (chỉ cuộn ngang, không làm trang nhảy dọc).
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    const navBox = nav.getBoundingClientRect();
    const tabBox = el.getBoundingClientRect();
    nav.scrollLeft += tabBox.left - navBox.left - (navBox.width - tabBox.width) / 2;
  }, [activeHref]);

  return (
    <nav ref={navRef} aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <ul className="flex w-max gap-1 rounded-full border bg-card p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                scroll={false}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-10",
                  tab.active ? "text-white" : "text-foreground/65 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {tab.active && <motion.span aria-hidden layoutId={`link-tab-${id}`} className="absolute inset-0 rounded-full bg-active-gradient" transition={spring} />}
                <span className="relative flex items-center gap-1.5">
                  {Icon && <Icon className="size-4" aria-hidden />}
                  {tab.label}
                  {tab.badge && (
                    <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", tab.active ? "bg-white/20" : "bg-muted text-muted-foreground")}>{tab.badge}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
