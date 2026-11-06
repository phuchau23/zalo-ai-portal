import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconTile } from "./icon-tile";
import { PageHelp } from "./page-help";

/**
 * Tiêu đề trang thống nhất: (nút quay lại) · ô biểu tượng dải màu · tiêu đề lớn + mô tả · nút thao tác bên phải
 * · "Cách dùng trang này" (gập được) cho người mới. Nằm trên nền lưới chấm + quầng sáng của tấm nội dung (AppShell).
 * `tone="ai"`: trang thuộc nhóm Trợ lý AI (ô biểu tượng màu tím).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  icon: Icon,
  tone = "primary",
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
    <header className="flex flex-col gap-4 pb-2">
      {back && (
        <Link
          href={back.href}
          className="group inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full border border-border/70 bg-card/80 py-1 pr-3.5 pl-2.5 text-sm text-muted-foreground shadow-card backdrop-blur transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && <IconTile icon={Icon} tone={tone} variant="solid" size="lg" className="hidden sm:flex" />}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight text-balance sm:text-[28px]">{title}</h1>
            {description && <p className="max-w-3xl text-sm text-pretty text-muted-foreground sm:text-[15px]">{description}</p>}
            {meta}
          </div>
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
