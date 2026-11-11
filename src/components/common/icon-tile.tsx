import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "ai" | "success" | "warning" | "destructive" | "muted";

/** Ô nền đậm, phẳng (design.md: không dải màu, không phát sáng). Dùng rất ít: logo, mục cần nổi bật. */
const solid: Record<Tone, string> = {
  primary: "bg-foreground text-background",
  ai: "bg-primary text-primary-foreground",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  destructive: "bg-destructive text-white",
  muted: "bg-foreground/80 text-background",
};

/**
 * Ô nền nhạt: trong thẻ, danh sách, thống kê. "primary" là trung tính (nền xám, biểu tượng màu mực) — màu chàm chỉ để
 * điểm nhấn (design.md § Màu). Các tông trạng thái giữ màu trạng thái để đọc nhanh; "ai" là chàm nhạt (việc trợ lý làm).
 */
const soft: Record<Tone, string> = {
  primary: "bg-muted text-foreground/70",
  ai: "bg-ai-soft text-ai",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const sizes = {
  sm: "size-8 rounded-md [&_svg]:size-4",
  md: "size-10 rounded-lg [&_svg]:size-5",
  lg: "size-12 rounded-xl [&_svg]:size-[22px]",
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
    </span>
  );
}
