"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SubNavItem = { href: string; label: string; description: string; icon: LucideIcon };

/**
 * Bố cục trang có nhiều mục con (Cài đặt, Thiết lập trợ lý): danh sách mục bên trái (máy tính) hoặc hàng nút cuộn ngang
 * (điện thoại), nội dung mục đang chọn nằm trong một thẻ trắng bên phải. Mỗi mục là một đường dẫn riêng (gửi link được).
 */
export function SubNavLayout({
  label,
  items,
  header,
  children,
  tone = "primary",
}: {
  label: string;
  items: SubNavItem[];
  header: ReactNode;
  children: ReactNode;
  tone?: "primary" | "ai";
}) {
  const pathname = usePathname();
  // Mục khớp dài nhất thắng: "/settings/team" không làm sáng "/settings".
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid items-start gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:sticky md:top-8 md:mx-0 md:overflow-visible md:px-0">
          <ul className="flex gap-2 md:flex-col md:gap-1">
            {items.map((item) => {
              const isActive = item === active;
              const Icon = item.icon;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-0 md:items-start md:rounded-xl md:border-transparent md:p-2.5 md:whitespace-normal",
                      isActive
                        ? "border-primary/30 bg-card font-medium text-foreground shadow-card md:bg-transparent md:shadow-none"
                        : "bg-card text-muted-foreground hover:text-foreground md:bg-transparent md:hover:bg-card/60",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        aria-hidden
                        layoutId={`subnav-${label}`}
                        className="absolute inset-0 hidden rounded-xl border bg-card shadow-card md:block"
                        transition={spring}
                      />
                    )}
                    <span
                      className={cn(
                        "relative flex size-4 shrink-0 items-center justify-center rounded-lg transition-colors md:size-8",
                        isActive
                          ? tone === "ai"
                            ? "text-ai md:bg-ai md:text-white md:shadow-glow-ai"
                            : "text-primary md:bg-active-gradient md:text-white md:shadow-glow"
                          : "text-muted-foreground group-hover:text-foreground md:bg-muted md:group-hover:bg-background",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="relative flex flex-col gap-0.5 md:pt-0.5">
                      <span>{item.label}</span>
                      <span className="hidden text-xs leading-snug font-normal text-muted-foreground md:block">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="surface min-w-0 rounded-2xl p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}
