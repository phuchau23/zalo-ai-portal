import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

/** Khung xương dạng bảng trong lúc tải, giữ chỗ để màn hình không nhảy. */
export function LoadingRows({ rows = 5, columns = 4, label = "Đang tải dữ liệu" }: { rows?: number; columns?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="overflow-hidden rounded-md border">
      <div className="h-10 border-b bg-muted/60" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-3 py-3.5 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className={cn("h-3 animate-pulse rounded-sm bg-muted motion-reduce:animate-none", c === 0 ? "w-1/3" : "hidden flex-1 sm:block")}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}...</span>
    </div>
  );
}

/** Trạng thái trống: nói rõ vì sao trống và bước tiếp theo. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-md border border-dashed px-6 py-12 text-center", className)}>
      <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Lỗi tải dữ liệu, kèm nút thử lại nếu có. */
export function ErrorState({ problem, onRetry }: { problem: ApiProblem; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center">
      <CircleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
      <p className="flex-1 text-sm text-destructive">{problemMessage(problem)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
