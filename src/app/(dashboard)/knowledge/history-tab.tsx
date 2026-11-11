"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, CircleCheck, CircleX, Clock3, History, type LucideIcon } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/** Chấm trên dòng thời gian theo trạng thái lần nhập (luôn kèm nhãn chữ bên cạnh). */
const statusDot: Record<string, { icon: LucideIcon; className: string }> = {
  preview: { icon: Clock3, className: "bg-info text-white" },
  applied: { icon: CircleCheck, className: "bg-success text-white" },
  discarded: { icon: CircleX, className: "bg-muted text-muted-foreground" },
};

export const importStatus: Record<string, { label: string; variant: "info" | "success" | "secondary" }> = {
  preview: { label: "Chờ duyệt", variant: "info" },
  applied: { label: "Đã áp dụng", variant: "success" },
  discarded: { label: "Đã hủy", variant: "secondary" },
};

type Summary = Schemas["KnowledgeDiffSummaryResponse"];

/** Các con số thay đổi của một lần nhập; số 0 làm mờ để mắt dừng ở số khác 0. */
export function ChangeCounts({ summary, className }: { summary: Summary; className?: string }) {
  const parts = [
    { label: "mới", value: summary.added, tone: "text-success", sign: "+" },
    { label: "đổi", value: summary.changed, tone: "text-primary", sign: "~" },
    { label: "có thể trùng", value: summary.possibleDuplicate, tone: "text-warning", sign: "?" },
    { label: "không còn", value: summary.missing, tone: "text-destructive", sign: "−" },
  ];
  return (
    <span className={cn("tabular flex flex-wrap gap-x-3 gap-y-1 text-sm", className)}>
      {parts.map((p) => (
        <span key={p.label} className={p.value ? undefined : "text-muted-foreground/70"}>
          <span className={cn("font-semibold", p.value ? p.tone : undefined)}>
            {p.sign}
            {p.value}
          </span>{" "}
          {p.label}
        </span>
      ))}
    </span>
  );
}

export function HistoryTab() {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/knowledge/imports")));

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (loading && !data) return <LoadingRows columns={4} />;
  if (!data?.length) {
    return <EmptyState icon={History} title="Chưa có lần nhập nào" description="Mỗi lần nhập file ở tab Nhập file sẽ được lưu ở đây để xem lại." />;
  }

  return (
    <motion.ol
      variants={stagger}
      initial="hidden"
      animate="show"
      aria-label="Các lần nhập dữ liệu"
      className="relative flex flex-col gap-3 before:absolute before:top-5 before:bottom-5 before:left-[19px] before:w-px before:bg-border"
    >
      {data.map((i) => {
        const status = importStatus[i.status] ?? { label: i.status, variant: "secondary" as const };
        const dot = statusDot[i.status] ?? statusDot.discarded;
        const DotIcon = dot.icon;
        return (
          <motion.li key={i.id} variants={fadeUp} className="relative flex gap-3 sm:gap-4">
            <span className={cn("relative z-10 mt-4 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-canvas", dot.className)} aria-hidden>
              <DotIcon className="size-4.5" />
            </span>
            <div className="surface lift group relative flex min-w-0 flex-1 flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Link phủ cả thẻ (after:inset-0) để bấm chỗ nào cũng mở. */}
                <Link
                  className="font-semibold break-all after:absolute after:inset-0 after:rounded-[inherit] group-hover:text-primary focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  href={`/knowledge/imports/${i.id}`}
                >
                  {i.fileName}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="tabular">{formatDateTime(i.createdAt)}</span>
                </div>
              </div>
              <ChangeCounts summary={i.summary} className="text-[13px]" />
              <ChevronRight
                className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none sm:block"
                aria-hidden
              />
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
