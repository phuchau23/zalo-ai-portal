"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Mảnh giao diện dùng chung cho các trang Cài đặt và Quản trị hệ thống (chỉ trình bày, không gọi API).
 * Danh sách thẻ hiện lần lượt (stagger), khung "thêm mới" viền đứt nét, khối con có ô biểu tượng.
 */

/** Lỗi của một thao tác (không phải lỗi từng ô). */
export function ActionError({ problem, className }: { problem: ApiProblem | null | undefined; className?: string }) {
  if (!problem) return null;
  return (
    <p role="alert" className={cn("flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3 py-2 text-sm text-destructive", className)}>
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {problemMessage(problem)}
    </p>
  );
}

/** "Đã lưu" sau khi lưu xong. */
export function SavedNote({ show, children = "Đã lưu" }: { show: boolean; children?: ReactNode }) {
  if (!show) return null;
  return (
    <motion.span
      role="status"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
    >
      <CircleCheck className="size-4" aria-hidden />
      {children}
    </motion.span>
  );
}

/** Khung "thêm mới": viền đứt nét màu chính, tiêu đề có ô biểu tượng. */
export function AddPanel({
  icon,
  title,
  description,
  children,
  className,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.025] p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="flex min-w-0 flex-col">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-pretty text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Khối con trong một thẻ (ví dụ: Thông tin / Giờ mở cửa / Ngày nghỉ của chi nhánh). */
export function SubCard({
  icon,
  title,
  description,
  actions,
  children,
  className,
  tone = "primary",
}: {
  icon?: LucideIcon;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card", className)}>
      {(title || icon) && (
        <div className="flex flex-wrap items-center gap-3">
          {icon && <IconTile icon={icon} tone={tone} size="sm" />}
          <div className="flex min-w-0 flex-1 flex-col">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Danh sách thẻ hiện lần lượt từng mục. */
export function MotionList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <motion.ul aria-label={label} variants={stagger} initial="hidden" animate="show" className={cn("flex flex-col gap-2.5", className)}>
      {children}
    </motion.ul>
  );
}

/** Một thẻ trong MotionList: viền mảnh, nổi nhẹ, viền sáng màu chính khi rê chuột. */
export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li
      variants={fadeUp}
      className={cn("rounded-xl border bg-card shadow-card transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-card-hover", className)}
    >
      {children}
    </motion.li>
  );
}

/** Khung xương cho form cài đặt đang tải. */
export function FormSkeleton({ rows = 3, label = "Đang tải cài đặt" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-4 xl:grid-cols-[14rem_1fr]">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-44 opacity-70" />
          </div>
          <div className="flex max-w-xl flex-col gap-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
