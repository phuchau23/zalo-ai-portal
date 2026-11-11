"use client";

import type { ReactNode } from "react";
import { Bot, CircleDashed, Database, FileStack, LoaderCircle, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { usePolling, useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/** Tổng quan kho + tiến độ chuẩn bị dữ liệu cho bot; tự cập nhật trong lúc còn việc đang chạy. */
export function StatusBar() {
  const { data, reload } = useApiData(() => call(() => api.GET("/knowledge/status")));
  const busy = Boolean(data && (data.chunksPendingIndex > 0 || data.documentsProcessing > 0));
  usePolling(busy, reload);

  const indexed = data ? data.chunks - data.chunksPendingIndex : 0;
  const percent = data && data.chunks > 0 ? Math.round((indexed / data.chunks) * 100) : 0;
  const ready = Boolean(data && !busy && data.chunks > 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_2fr]">
      <Cell icon={Database} label="Mục dữ liệu">
        {data ? <AnimatedNumber value={data.items} className="text-2xl font-bold tracking-tight" /> : <Placeholder />}
      </Cell>
      <Cell icon={FileStack} label="Tài liệu tham khảo">
        {data ? <AnimatedNumber value={data.documents} className="text-2xl font-bold tracking-tight" /> : <Placeholder />}
      </Cell>
      <Cell icon={Bot} label="Trạng thái bot" tone={ready ? "success" : "primary"} className="col-span-2 lg:col-span-1">
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
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ chuẩn bị dữ liệu"
            >
              <div className="h-full rounded-full bg-active-gradient transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Bot chưa dùng được phần đang chuẩn bị.</p>
          </div>
        ) : data.chunks > 0 ? (
          <p role="status" className="flex items-start gap-2 text-sm">
            <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            <span>
              <strong className="font-semibold text-success">Sẵn sàng</strong>
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

function Cell({ icon, label, tone = "primary", className, children }: { icon: LucideIcon; label: string; tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <div className={cn("surface flex items-center gap-3 p-3.5 sm:gap-3.5 sm:p-4", className)}>
      <IconTile icon={icon} tone={tone} size="md" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  );
}

function Placeholder() {
  return <span className="skeleton block h-7 w-16" aria-hidden />;
}
