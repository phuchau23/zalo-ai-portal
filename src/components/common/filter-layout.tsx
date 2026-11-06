import type { ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Bố cục trang danh sách có bộ lọc (chủ dự án chốt 2026-11-01): từ màn lg chia 3/7 — cột bộ lọc bên trái (đứng yên khi cuộn),
 * khung nội dung lớn bên phải. Màn hẹp: bộ lọc nằm trên, nội dung bên dưới.
 * Trong cột bộ lọc: các `FilterSection` xếp dọc (ô tìm, khoảng ngày, `FilterPills variant="list"`, ô chọn...).
 * `onReset` (khi có lọc đang bật) hiện nút "Xóa lọc".
 */
export function FilterLayout({
  filters,
  children,
  onReset,
  footer,
  className,
}: {
  filters: ReactNode;
  children: ReactNode;
  onReset?: () => void;
  /** Phần dưới cùng của cột bộ lọc (ví dụ nút Nhập/Xuất Excel). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid items-start gap-5 lg:grid-cols-[minmax(15rem,3fr)_minmax(0,7fr)] lg:gap-6", className)}>
      <aside aria-label="Bộ lọc" className="surface flex min-w-0 flex-col gap-5 rounded-2xl p-4 lg:sticky lg:top-4 lg:p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
            <SlidersHorizontal className="size-4" />
          </span>
          <h2 className="flex-1 text-sm font-semibold">Bộ lọc</h2>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Xóa lọc
            </button>
          )}
        </div>
        {filters}
        {footer && <div className="flex flex-col gap-2 border-t pt-4">{footer}</div>}
      </aside>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  );
}

/** Một nhóm trong cột bộ lọc: nhãn nhỏ in hoa + điều khiển. Có `htmlFor` thì nhãn là <Label> gắn với ô nhập. */
export function FilterSection({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  const labelClass = "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {htmlFor ? (
        <Label htmlFor={htmlFor} className={labelClass}>
          {label}
        </Label>
      ) : (
        <p className={labelClass}>{label}</p>
      )}
      {children}
    </div>
  );
}
