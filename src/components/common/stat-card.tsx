import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { IconTile, type Tone } from "./icon-tile";

/**
 * Viên "+12,5%" so với kỳ trước. Có mũi tên + chữ, không chỉ dựa vào màu (quy tắc color-not-only).
 * `upIsGood=false` cho số càng thấp càng tốt (khách không đến, nợ...).
 */
export function DeltaBadge({ value, upIsGood = true, label = "so với kỳ trước", className }: { value: number | null; upIsGood?: boolean; label?: string; className?: string }) {
  if (value === null)
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Minus className="size-3" aria-hidden />
        Chưa có kỳ trước để so
      </span>
    );
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : value > 0 === upIsGood;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const text = `${value > 0 ? "+" : ""}${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full px-1.5 font-semibold tabular-nums",
          good === null ? "bg-muted text-muted-foreground" : good ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="size-3" aria-hidden />
        <span className="sr-only">{flat ? "Không đổi" : value > 0 ? "Tăng" : "Giảm"} </span>
        {text}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

/**
 * Thẻ một chỉ số: nhãn + ô biểu tượng, số lớn chạy từ giá trị cũ, so với kỳ trước, đường xu hướng nhỏ, dòng ghi chú.
 * `emphasis`: thẻ chỉ số chính của trang (nền nhạt màu, số lớn hơn).
 */
const tintClass = {
  sky: "bg-tint-sky",
  peach: "bg-tint-peach",
  sage: "bg-tint-sage",
  butter: "bg-tint-butter",
} as const;

export function StatCard({
  icon,
  tone = "primary",
  label,
  value,
  format,
  title,
  delta,
  upIsGood,
  spark,
  hint,
  emphasis,
  tint,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  label: string;
  value: number;
  format?: (n: number) => string;
  /** Số đầy đủ khi rê chuột (thẻ hiện số gọn "12,5 tr"). */
  title?: string;
  delta?: number | null;
  upIsGood?: boolean;
  spark?: number[];
  hint?: ReactNode;
  emphasis?: boolean;
  /** Tô khối màu pastel (bento) cho ô thường; ô `emphasis` luôn là xanh chanh. */
  tint?: "sky" | "peach" | "sage" | "butter";
  className?: string;
}) {
  const filled = emphasis || tint;
  const Icon = icon;
  return (
    <div
      className={cn(
        "relative flex min-h-36 min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-2xl p-4 sm:p-5",
        emphasis ? "bg-lime text-lime-foreground" : tint ? tintClass[tint] : "border bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex min-w-0 items-center gap-2 text-[13px] font-medium", filled ? "opacity-80" : "text-muted-foreground")}>
          {filled ? <Icon className="size-4 shrink-0" aria-hidden /> : <IconTile icon={icon} tone={tone} size="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />}
          <span className="truncate">{label}</span>
        </span>
        {spark && spark.length > 1 && spark.some((v) => v > 0) && (
          <Sparkline values={spark} tone={filled ? "ink" : tone === "ai" ? "ai" : tone === "success" ? "success" : tone === "warning" ? "warning" : "primary"} width={72} height={26} />
        )}
      </div>
      <div className={cn("num-display whitespace-nowrap", emphasis ? "text-[44px]" : "text-[36px]")} title={title}>
        <AnimatedNumber value={value} format={format} />
      </div>
      {(delta !== undefined || hint) && (
        <div className="flex flex-col gap-1">
          {delta !== undefined && <DeltaBadge value={delta} upIsGood={upIsGood} />}
          {hint && <p className={cn("text-xs leading-snug", filled ? "opacity-75" : "text-muted-foreground")}>{hint}</p>}
        </div>
      )}
    </div>
  );
}
