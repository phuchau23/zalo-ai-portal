"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { useApiData, useNow } from "@/lib/use-api-data";
import { SuggestionCard } from "./suggestion-card";

type Filter = "all" | "mine" | "hot" | "expiring";
type Status = "open" | "autosent" | "done" | "skipped" | "expired";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "mine", label: "Của tôi" },
  { value: "hot", label: "Nóng" },
  { value: "expiring", label: "Sắp hết hạn nhắn" },
];

const statuses: { value: Status; label: string }[] = [
  { value: "open", label: "Cần làm" },
  { value: "autosent", label: "Bot đã nhắn" },
  { value: "done", label: "Đã xử lý" },
  { value: "skipped", label: "Đã bỏ qua" },
  { value: "expired", label: "Hết hạn nhắn" },
];

export function CarePage() {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<Status>("open");
  const now = useNow();

  const { data, problem, loading, reload } = useApiData(() =>
    call(() => api.GET("/care/suggestions", { params: { query: { status, filter } } })),
  );
  const { data: members } = useApiData(() => call(() => api.GET("/tenant/members")));

  const refresh = reload;

  useEffect(() => {
    refresh();
  }, [filter, status, me.currentTenant?.id, refresh]);

  // Gợi ý mới do AI tạo (sự kiện "care") hoặc khách nhắn lại → tải lại; dự phòng 60 giây một lần.
  useEffect(() => {
    const source = new EventSource("/api/inbox/stream");
    source.onmessage = () => refresh();
    const poll = setInterval(refresh, 60_000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [refresh, me.currentTenant?.id]);

  const items = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="group" aria-label="Lọc gợi ý" className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
          {filters.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant="outline"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className="h-11 shrink-0 sm:h-8 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="h-11 w-full sm:h-8 sm:w-44" aria-label="Trạng thái gợi ý">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {problem && !data && <ErrorState problem={problem} onRetry={refresh} />}
      {loading && !data && (
        <div role="status" aria-label="Đang tải gợi ý" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      )}
      {data && items.length === 0 && (
        <EmptyState
          icon={HeartHandshake}
          title={status === "open" ? "Chưa có khách nào cần nhắn" : "Không có gợi ý nào"}
          description={
            status === "open"
              ? "Khi khách im lặng quá vài giờ mà chưa chốt, AI sẽ gợi ý ở đây. Bạn cũng có thể ghi ngày hẹn chăm sóc lại trong hồ sơ khách."
              : "Đổi bộ lọc để xem các gợi ý khác."
          }
        >
          {status === "open" && (
            <Link href="/customers" className={buttonVariants({ variant: "outline" })}>
              Xem danh sách khách
            </Link>
          )}
        </EmptyState>
      )}
      <div className="flex flex-col gap-3">
        {items.map((s) => (
          <SuggestionCard key={`${s.id}-${s.updatedAt}`} suggestion={s} members={members} isOwner={isOwner} now={now} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}
