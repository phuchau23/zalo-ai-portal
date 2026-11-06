import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "ai" | "success" | "warning" | "destructive" | "muted";

/** Ô dải màu, chữ trắng: tiêu đề trang, trạng thái trống, mục nổi bật. */
const solid: Record<Tone, string> = {
  primary: "bg-active-gradient text-white shadow-glow",
  ai: "bg-[linear-gradient(135deg,var(--ai),color-mix(in_oklch,var(--ai)_55%,var(--primary)))] text-white shadow-glow-ai",
  success: "bg-[linear-gradient(135deg,var(--success),color-mix(in_oklch,var(--success)_65%,var(--primary)))] text-white",
  warning: "bg-[linear-gradient(135deg,var(--warning),color-mix(in_oklch,var(--warning)_70%,var(--destructive)))] text-white",
  destructive: "bg-[linear-gradient(135deg,var(--destructive),color-mix(in_oklch,var(--destructive)_70%,var(--ai)))] text-white",
  muted: "bg-foreground/80 text-background",
};

/** Ô nền nhạt, biểu tượng màu: trong thẻ, danh sách, thống kê. */
const soft: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary ring-1 ring-primary/15 ring-inset",
  ai: "bg-ai-soft text-ai ring-1 ring-ai/15 ring-inset",
  success: "bg-success/10 text-success ring-1 ring-success/15 ring-inset",
  warning: "bg-warning/10 text-warning ring-1 ring-warning/20 ring-inset",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-destructive/15 ring-inset",
  muted: "bg-muted text-muted-foreground ring-1 ring-border ring-inset",
};

const sizes = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-12 rounded-2xl [&_svg]:size-[22px]",
};

/** Ô vuông bo góc chứa một biểu tượng. Chỉ để trang trí (aria-hidden): ý nghĩa nằm ở chữ bên cạnh. */
export function IconTile({
  icon: Icon,
  tone = "primary",
  variant = "soft",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  variant?: "soft" | "solid";
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center", sizes[size], variant === "solid" ? solid[tone] : soft[tone], className)} aria-hidden>
      <Icon />
      {variant === "solid" && <span className="absolute inset-0 rounded-[inherit] ring-1 ring-white/20 ring-inset" />}
    </span>
  );
}
