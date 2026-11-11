import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { cn } from "@/lib/utils";

/**
 * Khung thẻ cho một biểu đồ/khối số liệu: tiêu đề + mô tả ngắn (đọc biểu đồ thế nào) + thao tác bên phải,
 * thân biểu đồ, chân (ghi chú/nguồn số). Tự lo trạng thái đang tải (khung xương đúng dáng) và trống (nói rõ vì sao).
 */
export function ChartCard({
  title,
  description,
  icon,
  tone = "primary",
  actions,
  footer,
  loading,
  empty,
  emptyHint,
  skeleton = "chart",
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  actions?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyHint?: string;
  skeleton?: "chart" | "list" | "ring";
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("surface flex min-w-0 flex-col rounded-2xl", className)} aria-label={title}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <IconTile icon={icon} tone={tone} size="sm" className="mt-0.5" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            {description && <p className="text-[13px] leading-snug text-pretty text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn("flex-1 px-5 pt-4 pb-5", bodyClassName)}>
        {loading ? <ChartSkeleton kind={skeleton} /> : empty ? <ChartEmpty hint={emptyHint} /> : children}
      </div>
      {footer && !loading && <footer className="border-t px-5 py-3 text-xs text-muted-foreground">{footer}</footer>}
    </section>
  );
}

function ChartSkeleton({ kind }: { kind: "chart" | "list" | "ring" }) {
  if (kind === "list")
    return (
      <div role="status" aria-label="Đang tải" className="flex flex-col gap-2">
        {[92, 74, 58, 41, 30].map((w) => (
          <div key={w} className="skeleton h-9 rounded-lg" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  if (kind === "ring")
    return (
      <div role="status" aria-label="Đang tải" className="flex items-center gap-5">
        <div className="skeleton size-28 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-3/5" />
        </div>
      </div>
    );
  return (
    <div role="status" aria-label="Đang tải biểu đồ" className="relative h-[260px] overflow-hidden rounded-xl">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute inset-x-0 border-t border-dashed" style={{ top: `${8 + i * 26}%` }} />
      ))}
      <div className="skeleton absolute inset-x-0 bottom-6 h-1/2 rounded-xl opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" />
    </div>
  );
}

function ChartEmpty({ hint }: { hint?: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/25 px-6 py-8 text-center">
      <BarChart3 className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">Chưa có số liệu</p>
      {hint && <p className="max-w-xs text-xs text-pretty text-muted-foreground">{hint}</p>}
    </div>
  );
}
