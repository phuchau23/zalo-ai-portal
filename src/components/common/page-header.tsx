import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconTile } from "./icon-tile";
import { PageHelp } from "./page-help";

/**
 * Tiêu đề trang thống nhất (design.md § Workbench): (quay lại) · tiêu đề lớn chữ Bricolage + mô tả · thao tác bên phải
 * · "Cách dùng trang này" (gập được) cho người mới. Không đặt ô biểu tượng cạnh tiêu đề (dấu hiệu "giao diện AI");
 * `icon`/`tone` giữ trong kiểu để các trang cũ không phải sửa, nhưng không vẽ.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  help,
  helpKey,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "ai";
  /** Vài dòng hướng dẫn (danh sách <ul>/<ol>). Có thì hiện nút "Cách dùng trang này". */
  help?: ReactNode;
  /** Khóa nhớ trạng thái mở/gập phần hướng dẫn; mặc định lấy theo tiêu đề. */
  helpKey?: string;
}) {
  return (
    <header className="flex flex-col gap-3 pb-1">
      {back && (
        <Link
          href={back.href}
          className="group -ml-1 inline-flex min-h-8 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.05] font-semibold text-balance sm:text-[36px]">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-[15px]">{description}</p>}
          {meta}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {help && <PageHelp storageKey={helpKey ?? (typeof title === "string" ? title : "page")}>{help}</PageHelp>}
    </header>
  );
}

/** Tiêu đề một phần trong trang (không đóng khung). Có `icon` thì hiện ô biểu tượng nhỏ bên trái. */
export function SectionHeader({
  title,
  description,
  actions,
  icon,
  tone = "primary",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "ai";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} size="sm" className="mt-0.5" />}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
