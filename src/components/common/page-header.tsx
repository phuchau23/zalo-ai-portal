import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Tiêu đề trang thống nhất: (link quay lại) · tiêu đề + mô tả · nút thao tác bên phải. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-5">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
          {description && <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{description}</p>}
          {meta}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
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
