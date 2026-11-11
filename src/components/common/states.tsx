import { CircleAlert, RotateCcw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { IconTile } from "./icon-tile";

/** Khung xương dạng bảng trong lúc tải (dải sáng chạy ngang), giữ chỗ để màn hình không nhảy. */
export function LoadingRows({ rows = 5, columns = 4, label = "Đang tải dữ liệu" }: { rows?: number; columns?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="h-10 border-b bg-muted/50" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border/70 px-4 py-3.5 last:border-0">
          <div className="skeleton size-8 shrink-0 rounded-full" />
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className={cn("skeleton h-3", c === 0 ? "w-1/3" : "hidden flex-1 sm:block")} style={{ opacity: 1 - c * 0.15 }} />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}...</span>
    </div>
  );
}

/**
 * Trạng thái trống: nói rõ vì sao trống và bước tiếp theo.
 * Mặc định: khung viền đứt, căn trái — biểu tượng xám, tiêu đề, một câu lý do, nút việc tiếp theo bên phải (design.md).
 * `compact`: dùng bên trong một thẻ khác (không khung, không vòng tròn).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  tone = "primary",
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "primary" | "ai";
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("flex flex-col items-center gap-3 px-4 py-8 text-center", className)}>
        <IconTile icon={Icon} tone={tone} size="md" />
        <div className="flex max-w-md flex-col gap-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-4 rounded-xl border border-dashed bg-card/60 px-6 py-8 sm:flex-row sm:items-center sm:gap-5 sm:px-8", className)}>
      <IconTile icon={Icon} tone={tone === "ai" ? "ai" : "muted"} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-display text-lg leading-snug font-semibold">{title}</p>
        {description && <p className="max-w-xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Lỗi tải dữ liệu, kèm nút thử lại nếu có. */
export function ErrorState({ problem, onRetry }: { problem: ApiProblem; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/25 bg-card p-4 shadow-card sm:flex-row sm:items-center"
    >
      <IconTile icon={CircleAlert} tone="destructive" size="sm" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">Không tải được dữ liệu</p>
        <p className="text-sm text-destructive">{problemMessage(problem)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Thử lại
        </Button>
      )}
    </div>
  );
}
