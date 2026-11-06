import { BadgeCheck, CircleSlash, Eye, Flame, Sprout, type LucideIcon } from "lucide-react";
import { leadStatusOf, type LeadStatus } from "@/lib/customers";
import { cn } from "@/lib/utils";
import type { Tone } from "./icon-tile";

/**
 * Hình thức của 5 mức tiềm năng (Mới → Quan tâm → Nóng → Đã chốt / Không tiềm năng): biểu tượng + màu.
 * Dùng chung cho nhãn trạng thái (LeadStatusBadge) và danh sách lọc (FilterPills `icon`/`tone`) để hai chỗ cùng màu.
 */
export const leadStatusLook: Record<LeadStatus, { icon: LucideIcon; tone: Tone; badge: string }> = {
  new: { icon: Sprout, tone: "muted", badge: "border-border bg-background text-foreground/80 [&_svg]:text-primary" },
  interested: { icon: Eye, tone: "primary", badge: "border-primary/20 bg-primary/10 text-primary" },
  hot: {
    icon: Flame,
    tone: "warning",
    badge:
      "border-transparent bg-[linear-gradient(135deg,var(--warning),color-mix(in_oklch,var(--warning)_55%,var(--destructive)))] text-white shadow-[0_4px_12px_-6px_var(--warning)]",
  },
  won: { icon: BadgeCheck, tone: "success", badge: "border-success/25 bg-success/10 text-success" },
  lost: { icon: CircleSlash, tone: "muted", badge: "border-dashed border-border bg-muted/60 text-muted-foreground" },
};

/** Nhãn mức tiềm năng của khách: viên bo tròn có biểu tượng. "Nóng" nổi bật (dải cam). `manual`: nhân viên đặt tay. */
export function LeadStatusBadge({ status, manual, size = "md", className }: { status: string; manual?: boolean; size?: "sm" | "md"; className?: string }) {
  const info = leadStatusOf(status);
  const look = leadStatusLook[info.value as LeadStatus] ?? leadStatusLook.new;
  const Icon = look.icon;
  return (
    <span
      title={manual === undefined ? info.hint : `${info.hint}. ${manual ? "Nhân viên đã đặt" : "Hệ thống tự xếp"}`}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "h-5 pr-2 pl-1.5 text-[11px] [&_svg]:size-3" : "h-6 pr-2.5 pl-2 text-xs [&_svg]:size-3.5",
        look.badge,
        className,
      )}
    >
      <Icon aria-hidden />
      {info.label}
    </span>
  );
}
