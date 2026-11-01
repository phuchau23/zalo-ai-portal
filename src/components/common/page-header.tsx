import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHelp } from "./page-help";

/**
 * Tiêu đề trang thống nhất: (link quay lại) · ô biểu tượng · tiêu đề + mô tả · nút thao tác bên phải
 * · "Cách dùng trang này" (gập được) cho người mới.
 * `tone="ai"`: trang thuộc nhóm Trợ lý AI (biểu tượng màu tím).
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
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {Icon && (
            <span
              className={cn(
                "hidden size-11 shrink-0 items-center justify-center rounded-xl border bg-card shadow-card sm:flex",
                tone === "ai" ? "text-ai" : "text-primary",
              )}
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
            {description && <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{description}</p>}
            {meta}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {help && <PageHelp storageKey={helpKey ?? (typeof title === "string" ? title : "page")}>{help}</PageHelp>}
    </header>
  );
}

/** Tiêu đề một phần trong trang (không đóng khung). */
export function SectionHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
