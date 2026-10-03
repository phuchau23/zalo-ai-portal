"use client";

import type { ReactNode } from "react";
import { CircleCheck, CircleDashed, LoaderCircle } from "lucide-react";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { usePolling, useApiData } from "@/lib/use-api-data";

/** Tổng quan kho + tiến độ chuẩn bị dữ liệu cho bot; tự cập nhật trong lúc còn việc đang chạy. */
export function StatusBar() {
  const { data, reload } = useApiData(() => call(() => api.GET("/knowledge/status")));
  const busy = Boolean(data && (data.chunksPendingIndex > 0 || data.documentsProcessing > 0));
  usePolling(busy, reload);

  const indexed = data ? data.chunks - data.chunksPendingIndex : 0;
  const percent = data && data.chunks > 0 ? Math.round((indexed / data.chunks) * 100) : 0;

  return (
    <div className="grid overflow-hidden rounded-md border sm:grid-cols-[1fr_1fr_2fr]">
      <Cell label="Mục dữ liệu">{data ? <Count value={data.items} /> : <Placeholder />}</Cell>
      <Cell label="Tài liệu tham khảo">{data ? <Count value={data.documents} /> : <Placeholder />}</Cell>
      <Cell label="Trạng thái bot">
        {!data ? (
          <Placeholder />
        ) : busy ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
              Đang chuẩn bị dữ liệu · {indexed}/{data.chunks} đoạn
              {data.documentsProcessing > 0 && ` · ${data.documentsProcessing} tài liệu đang đọc`}
            </p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ chuẩn bị dữ liệu"
            >
              <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Bot chưa dùng được phần đang chuẩn bị.</p>
          </div>
        ) : data.chunks > 0 ? (
          <p role="status" className="flex items-start gap-2 text-sm">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>
              <strong className="font-medium text-success">Sẵn sàng</strong>
              <span className="text-muted-foreground"> — bot đã dùng được toàn bộ dữ liệu. Kiểm tra ở tab “Thử tìm kiếm”.</span>
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDashed className="size-4" aria-hidden />
            Chưa có dữ liệu cho bot
          </p>
        )}
      </Cell>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="-mt-px flex flex-col justify-center gap-1.5 border-t px-4 py-3 sm:mt-0 sm:-ml-px sm:border-t-0 sm:border-l">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Count({ value }: { value: number }) {
  return <span className="tabular text-2xl font-semibold tracking-tight">{value.toLocaleString("vi-VN")}</span>;
}

function Placeholder() {
  return <span className="block h-7 w-16 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" aria-hidden />;
}
