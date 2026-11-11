"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { shares } from "@/lib/reports";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type BarItem = { key: string; label: string; value: number; note?: string; href?: string };

const toneBar = {
  primary: "bg-lime/55 group-hover:bg-lime/80",
  ai: "bg-ai/15 group-hover:bg-ai/22",
  success: "bg-success/15 group-hover:bg-success/22",
} as const;

const toneRank = {
  primary: "bg-primary text-primary-foreground",
  ai: "bg-ai text-ai-foreground",
  success: "bg-success text-white",
} as const;

/**
 * Xếp hạng dạng thanh ngang (dịch vụ bán chạy, doanh thu theo nhân viên/chi nhánh...).
 * Thanh nằm SAU chữ (không che chữ), dài theo mục lớn nhất; cột phải là số tiền + tỷ lệ % — không chỉ dựa vào màu.
 * Là danh sách <ol> nên trình đọc màn hình đọc đúng thứ hạng. Dài quá `limit` → nút "Xem thêm".
 */
export function BarList({
  items,
  format,
  tone = "primary",
  limit = 6,
  showShare = true,
  ranked = true,
  label,
}: {
  items: BarItem[];
  format: (value: number) => string;
  tone?: keyof typeof toneBar;
  limit?: number;
  showShare?: boolean;
  ranked?: boolean;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...items.map((i) => i.value));
  const pct = shares(items.map((i) => i.value));
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <div className="flex flex-col gap-1">
      <ol aria-label={label} className="flex flex-col gap-1.5">
        {visible.map((item, index) => {
          const inner = (
            <>
              <motion.span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 origin-left rounded-lg transition-colors", toneBar[tone])}
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: Math.min(index, 8) * 0.05, ease: easeOut }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-2.5">
                {ranked && (
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                      index === 0 ? toneRank[tone] : "bg-card/80 text-muted-foreground ring-1 ring-border",
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" title={item.label}>
                    {item.label}
                  </span>
                  {item.note && <span className="block truncate text-xs text-muted-foreground">{item.note}</span>}
                </span>
              </span>
              <span className="relative flex shrink-0 items-baseline gap-2 pl-3 tabular-nums">
                <span className="text-sm font-semibold">{format(item.value)}</span>
                {showShare && <span className="w-12 text-right text-xs text-muted-foreground">{pct[items.indexOf(item)].toLocaleString("vi-VN")}%</span>}
              </span>
            </>
          );
          const cls = "group relative flex min-h-11 items-center overflow-hidden rounded-lg px-2.5 py-1.5";
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} className={cn(cls, "transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}>
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-9 w-fit cursor-pointer items-center gap-1 self-center rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {expanded ? "Thu gọn" : `Xem thêm ${items.length - limit} mục`}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
