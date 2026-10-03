"use client";

import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export const importStatus: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  preview: { label: "Chờ duyệt", variant: "default" },
  applied: { label: "Đã áp dụng", variant: "secondary" },
  discarded: { label: "Đã hủy", variant: "outline" },
};

export function HistoryTab() {
  const { data, problem, loading } = useApiData(() => call(() => api.GET("/knowledge/imports")));

  if (problem && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{problemMessage(problem)}</AlertDescription>
      </Alert>
    );
  }

  if (loading && !data) return <p className="text-muted-foreground">Đang tải...</p>;
  if (!data?.length) return <p className="text-muted-foreground">Chưa có lần nhập nào.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thay đổi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((i) => {
            const status = importStatus[i.status] ?? { label: i.status, variant: "outline" as const };
            const s = i.summary;
            return (
              <TableRow key={i.id}>
                <TableCell>{formatDateTime(i.createdAt)}</TableCell>
                <TableCell className="whitespace-normal">
                  <Link className="underline underline-offset-4" href={`/knowledge/imports/${i.id}`}>
                    {i.fileName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="whitespace-normal text-sm text-muted-foreground">
                  +{s.added} mới · {s.changed} đổi · {s.possibleDuplicate} có thể trùng · {s.missing} không còn · {s.unchanged} giữ nguyên
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
