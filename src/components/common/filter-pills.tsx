"use client";

import { useId } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Tone } from "./icon-tile";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  /** Số mục của bộ lọc này; `alert` tô cam khi > 0 (ví dụ khách đang chờ). */
  count?: number;
  alert?: boolean;
  icon?: LucideIcon;
  /** Màu ô biểu tượng ở kiểu `list` (ví dụ cùng màu với nhãn trạng thái). */
  tone?: Tone;
};

/** Ô biểu tượng nhỏ trong danh sách lọc, nền nhạt theo màu. */
const toneTile: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  ai: "bg-ai-soft text-ai",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

/**
 * Nhóm nút lọc (chọn một): nền "đang chọn" trượt sang nút mới. Mỗi nút là <button aria-pressed>.
 * - `card`: hàng viên trên nền trang (thẻ trắng có viền), viên dải màu xanh.
 * - `soft`: hàng viên trong một thẻ khác (rãnh xám, viên trắng) — ví dụ cột danh sách Hộp thư.
 * - `list`: dùng trong cột bộ lọc của `FilterLayout`: từ màn lg xếp dọc thành danh sách (ô biểu tượng màu bên trái, số đếm bên
 *   phải, mục đang chọn nền xanh nhạt + vạch trái giống thanh bên); màn hẹp là hàng cuộn ngang.
 */
export function FilterPills<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = "card",
  className,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  variant?: "card" | "soft" | "list";
  className?: string;
}) {
  const id = useId();
  if (variant === "list") return <FilterList id={id} label={label} value={value} options={options} onChange={onChange} className={className} />;

  const soft = variant === "soft";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex max-w-full overflow-x-auto p-1 [scrollbar-width:none]",
        soft ? "gap-0.5 rounded-xl bg-muted/80" : "w-fit gap-1 rounded-full border bg-card",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        const hot = Boolean(option.alert && option.count);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex h-8 shrink-0 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-10",
              soft && "flex-1 justify-center rounded-lg px-1.5 text-[13px]",
              active ? (soft ? "text-foreground" : "text-white") : "text-foreground/65 hover:bg-background/70 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`filter-pill-${id}`}
                className={cn("absolute inset-0", soft ? "rounded-lg bg-background shadow-sm ring-1 ring-foreground/5" : "rounded-full bg-active-gradient")}
                transition={spring}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="size-4" aria-hidden />}
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    "tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                    hot ? "bg-warning text-white" : active && !soft ? "bg-white/20 text-white" : "bg-foreground/[0.07] text-muted-foreground",
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Kiểu `list`: danh sách dọc trong cột bộ lọc (màn lg), hàng cuộn ngang trên màn hẹp. */
function FilterList<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible", className)}>
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        const hot = Boolean(option.alert && option.count);
        const empty = option.count === 0;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-border/70 px-2.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:w-full lg:border-transparent pointer-coarse:h-11",
              active ? "font-semibold text-primary" : "font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`filter-list-${id}`}
                className="absolute inset-0 rounded-xl bg-primary/[0.08] ring-1 ring-primary/15 ring-inset"
                transition={spring}
              >
                <span className="absolute inset-y-2 -left-px hidden w-[3px] rounded-r-full bg-primary lg:block" />
              </motion.span>
            )}
            {Icon && (
              <span
                className={cn(
                  "relative flex size-6 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none [&_svg]:size-3.5",
                  toneTile[option.tone ?? "primary"],
                )}
                aria-hidden
              >
                <Icon />
              </span>
            )}
            <span className={cn("relative lg:flex-1 lg:text-left", empty && !active && "text-muted-foreground")}>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular relative inline-flex h-5 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : hot
                      ? "bg-warning/15 text-warning"
                      : empty
                        ? "text-muted-foreground/70"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
