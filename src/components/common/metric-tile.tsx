import type { LucideIcon } from "lucide-react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { IconTile, type Tone } from "./icon-tile";

/**
 * Ô số liệu GỌN cho trang làm việc hằng ngày (Lịch hẹn, Bán hàng): biểu tượng bên trái, nhãn + số + gợi ý bên phải, cao ~72px
 * để hàng 4 ô không đẩy nội dung chính xuống. Trang phân tích (Báo cáo, Hiệu suất) dùng `StatCard` (to hơn, có so sánh kỳ trước).
 * Đặt trong một <dl> (ô là cặp dt/dd). `tone="ai"` thêm biểu tượng trợ lý: số này do trợ lý làm ra.
 */
export function MetricTile({
  icon,
  tone = "primary",
  label,
  value,
  format,
  hint,
  highlight = false,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  label: string;
  value: number;
  format?: (n: number) => string;
  hint?: string;
  /** Tô màu con số theo `tone` (ví dụ còn nợ → cam) khi cần người xem chú ý. */
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("surface flex min-w-0 items-center gap-3 rounded-2xl p-3.5", className)}>
      <IconTile icon={icon} tone={tone} size="md" />
      <div className="flex min-w-0 flex-col">
        <dt className="flex items-center gap-1 truncate text-xs font-medium text-muted-foreground">
          {label}
          {tone === "ai" && <Bot className="size-3 text-ai" aria-hidden />}
        </dt>
        <dd
          className={cn(
            "truncate text-xl leading-tight font-bold tracking-tight sm:text-2xl",
            highlight && tone === "warning" && "text-warning",
            highlight && tone === "destructive" && "text-destructive",
            highlight && tone === "success" && "text-success",
          )}
        >
          <AnimatedNumber value={value} format={format} />
        </dd>
        {hint && <dd className="hidden truncate text-[11px] text-muted-foreground sm:block">{hint}</dd>}
      </div>
    </div>
  );
}
