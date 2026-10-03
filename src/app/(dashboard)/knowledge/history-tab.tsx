"use client";

import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

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
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="hidden sm:table-cell">Thời gian</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="hidden md:table-cell">Thay đổi</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Mở</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((i) => {
            const status = importStatus[i.status] ?? { label: i.status, variant: "secondary" as const };
            return (
              <TableRow key={i.id} className="group relative">
                <TableCell className="whitespace-normal">
                  {/* Link phủ cả dòng (after:inset-0) để bấm chỗ nào cũng mở. */}
                  <Link
                    className="font-medium after:absolute after:inset-0 hover:text-primary focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                    href={`/knowledge/imports/${i.id}`}
                  >
                    {i.fileName}
                  </Link>
                  <div className="text-xs text-muted-foreground sm:hidden">{formatDateTime(i.createdAt)}</div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDateTime(i.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <ChangeCounts summary={i.summary} />
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
