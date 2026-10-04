"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Inbox, Siren, UserRound } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type InboxItem } from "@/lib/api/client";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { handoffReasonLabel } from "../chat-test/labels";
import { ConversationView } from "./conversation-view";
import { documentTitle, elapsed, filters, priorityOf, type InboxFilter, type Priority } from "./inbox-utils";

/** Dự phòng khi kết nối realtime rớt (proxy, mạng): tải lại danh sách định kỳ. */
const fallbackPollMs = 20_000;

export function InboxPage({ initialConversationId }: { initialConversationId?: string }) {
  const { me } = useSession();
  const router = useRouter();
  const tenantId = me.currentTenant?.id;
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null);
  const [version, setVersion] = useState(0); // tăng khi có sự kiện realtime → khung chat tải lại
  const [now, setNow] = useState(() => Date.now());

  const { data, problem, loading, reload } = useApiData(() =>
    call(() => api.GET("/inbox/conversations", { params: { query: { filter, includeTest: true } } })),
  );
  const { data: attention, reload: reloadAttention } = useApiData(() =>
    call(() => api.GET("/inbox/conversations", { params: { query: { filter: "attention", includeTest: true } } })),
  );

  const refreshAll = useCallback(() => {
    reload();
    reloadAttention();
    setVersion((v) => v + 1);
  }, [reload, reloadAttention]);

  // Đổi bộ lọc / đổi doanh nghiệp → tải lại.
  useEffect(() => {
    reload();
  }, [filter, tenantId, reload]);

  // Realtime: máy chủ đẩy {type, conversationId}; chỉ là tín hiệu, dữ liệu tải lại qua API có kiểm quyền.
  useEffect(() => {
    const source = new EventSource("/api/inbox/stream");
    source.onmessage = () => refreshAll();
    const poll = setInterval(refreshAll, fallbackPollMs);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [refreshAll, tenantId]);

  // Đồng hồ cho "đã chờ X phút".
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const attentionCount = attention?.length ?? 0;
  useEffect(() => {
    document.title = documentTitle(attentionCount);
  }, [attentionCount]);

  function select(id: string | null) {
    setSelectedId(id);
    router.replace(id ? `/inbox?c=${id}` : "/inbox", { scroll: false });
  }

  const items = data ?? [];

  return (
    <div className="grid h-[calc(100dvh-9rem)] min-h-[32rem] overflow-hidden rounded-lg border bg-card lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Danh sách — trên điện thoại ẩn khi đang mở một hội thoại */}
      <section aria-label="Danh sách hội thoại" className={cn("flex min-h-0 flex-col border-r", selectedId && "hidden lg:flex")}>
        <div className="flex flex-col gap-2 border-b p-3">
          <div role="group" aria-label="Lọc hội thoại" className="flex gap-1.5 overflow-x-auto pb-1">
            {filters.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant="outline"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className="shrink-0 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              >
                {f.label}
                {f.value === "attention" && attentionCount > 0 && (
                  <span className="tabular rounded-full bg-warning px-1.5 text-xs text-white">{attentionCount}</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {problem && !data && (
            <div className="p-3">
              <ErrorState problem={problem} onRetry={reload} />
            </div>
          )}
          {loading && !data && (
            <div role="status" aria-label="Đang tải hội thoại" className="flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
              ))}
            </div>
          )}
          {data && items.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={filter === "attention" ? "Không có khách nào đang chờ" : "Chưa có hội thoại"}
              description={
                filter === "attention"
                  ? "Bot đang tự trả lời. Khách cần người sẽ hiện ở đây kèm thông báo."
                  : "Khi khách nhắn vào Zalo OA (hoặc bạn chat thử), hội thoại sẽ hiện ở đây."
              }
              className="m-3 border-0"
            />
          )}
          <ul className="flex flex-col">
            {items.map((item) => (
              <ConversationRow key={item.id} item={item} now={now} selected={item.id === selectedId} onSelect={() => select(item.id)} />
            ))}
          </ul>
        </div>
      </section>

      {/* Khung hội thoại */}
      <section aria-label="Hội thoại" className={cn("min-h-0", !selectedId && "hidden lg:block")}>
        {selectedId ? (
          <ConversationView key={selectedId} conversationId={selectedId} version={version} now={now} onBack={() => select(null)} onChanged={refreshAll} />
        ) : (
          <EmptyState
            icon={UserRound}
            title="Chọn một hội thoại"
            description="Ca có màu cam/đỏ là khách đang chờ người trả lời. Bấm vào để xem và tiếp quản."
            className="m-6 border-0"
          />
        )}
      </section>
    </div>
  );
}

const priorityStyles: Record<Priority, { bar: string; badge?: { label: string; variant: "destructive" | "warning" } }> = {
  urgent: { bar: "bg-destructive", badge: { label: "Khẩn cấp", variant: "destructive" } },
  attention: { bar: "bg-warning", badge: { label: "Cần bạn", variant: "warning" } },
  human: { bar: "bg-primary/40" },
  bot: { bar: "bg-transparent" },
};

function ConversationRow({ item, now, selected, onSelect }: { item: InboxItem; now: number; selected: boolean; onSelect: () => void }) {
  const priority = priorityOf(item);
  const style = priorityStyles[priority];
  const waiting = item.needsAttentionSince ? elapsed(item.needsAttentionSince, now) : null;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative flex w-full cursor-pointer gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none",
          selected && "bg-accent/60 hover:bg-accent/60",
          priority === "bot" && !selected && "opacity-80",
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1", style.bar)} aria-hidden />
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            priority === "urgent" ? "bg-destructive/10 text-destructive" : priority === "bot" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
          )}
          aria-hidden
        >
          {priority === "urgent" ? <Siren className="size-4" /> : item.mode === "bot" ? <Bot className="size-4" /> : <UserRound className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-sm", item.needsAttentionSince ? "font-semibold" : "font-medium")}>{item.contactName}</span>
            {item.isTest && (
              <Badge variant="outline" className="shrink-0">
                Chat thử
              </Badge>
            )}
            <span className="tabular ml-auto shrink-0 text-xs text-muted-foreground">{elapsed(item.lastMessageAt, now)}</span>
          </span>
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {item.lastSender === "customer" ? "" : item.lastSender === "staff" ? "Bạn: " : item.lastSender === "bot" ? "Bot: " : ""}
            {item.lastMessagePreview ?? "…"}
          </span>
          {(style.badge || item.handoffReason) && (
            <span className="flex flex-wrap items-center gap-1.5">
              {style.badge && (
                <Badge variant={style.badge.variant}>
                  {style.badge.label}
                  {waiting && ` · chờ ${waiting}`}
                </Badge>
              )}
              {item.needsAttentionSince && item.handoffReason && (
                <span className="truncate text-xs text-muted-foreground">{handoffReasonLabel(item.handoffReason)}</span>
              )}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
