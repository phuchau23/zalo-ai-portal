import { CircleCheck, CircleDashed, CircleDotDashed, CircleX, Undo2, type LucideIcon } from "lucide-react";
import type { InvoiceStatus } from "@/lib/sales";
import { invoiceStatusOf } from "@/lib/sales";
import { cn } from "@/lib/utils";
import type { Tone } from "./icon-tile";

/** Màu viên trạng thái theo `tone` (nền nhạt, viền nhạt, chữ đậm cùng màu — đạt tương phản trên nền trắng). */
const toneClass: Record<Tone, string> = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  ai: "border-ai/20 bg-ai-soft text-ai",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/60 text-muted-foreground",
};

/** Viên trạng thái có biểu tượng (dùng chung cho các trạng thái dữ liệu: hóa đơn, ...). */
export function StatusPill({ icon: Icon, tone, label, size = "md", className }: { icon: LucideIcon; tone: Tone; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "h-5 pr-2 pl-1.5 text-[11px] [&_svg]:size-3" : "h-6 pr-2.5 pl-2 text-xs [&_svg]:size-3.5",
        toneClass[tone],
        className,
      )}
    >
      <Icon aria-hidden />
      {label}
    </span>
  );
}

/** Biểu tượng + màu của từng trạng thái hóa đơn — dùng cho nhãn và danh sách lọc để hai chỗ cùng màu. */
export const invoiceStatusLook: Record<InvoiceStatus, { icon: LucideIcon; tone: Tone }> = {
  open: { icon: CircleDashed, tone: "warning" },
  partial: { icon: CircleDotDashed, tone: "primary" },
  paid: { icon: CircleCheck, tone: "success" },
  void: { icon: CircleX, tone: "muted" },
  refunded: { icon: Undo2, tone: "muted" },
};

export function InvoiceStatusBadge({ status, size, className }: { status: string; size?: "sm" | "md"; className?: string }) {
  const look = invoiceStatusLook[status as InvoiceStatus] ?? invoiceStatusLook.open;
  return <StatusPill icon={look.icon} tone={look.tone} label={invoiceStatusOf(status).label} size={size} className={className} />;
}
