"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
                      "group flex min-h-11 items-center gap-2.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-0 md:items-start md:rounded-lg md:border-transparent md:px-3 md:py-2.5 md:whitespace-normal",
                      isActive
                        ? "border-primary/30 bg-card font-medium text-foreground shadow-card md:border-border"
                        : "bg-card text-muted-foreground hover:text-foreground md:bg-transparent md:hover:bg-card/70",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 md:mt-0.5",
                        isActive ? (tone === "ai" ? "text-ai" : "text-primary") : "text-muted-foreground group-hover:text-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="flex flex-col gap-0.5">
                      <span>{item.label}</span>
                      <span className="hidden text-xs leading-snug font-normal text-muted-foreground md:block">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="surface min-w-0 p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}
