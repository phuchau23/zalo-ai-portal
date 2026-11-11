"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Hand, MessagesSquare } from "lucide-react";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { easeOut } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";
import { documentTitle, type InboxFilter } from "./inbox-utils";

/** Dự phòng khi kết nối realtime rớt (proxy, mạng): tải lại danh sách định kỳ. */
const fallbackPollMs = 20_000;

/**
 * Hộp thư kiểu ứng dụng nhắn tin, chiếm trọn tấm nội dung (AppShell: trang "full bleed").
 * Máy tính: danh sách | khung chat | thông tin khách. Điện thoại: danh sách → bấm vào thì trượt sang khung chat.
 */
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

  return (
    // Điện thoại: cao bằng màn hình trừ thanh trên (3.5rem) và phần chừa cho thanh dưới (5rem) → không cuộn cả trang.
    <div className="flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] min-h-[28rem] overflow-hidden md:h-auto md:min-h-0 md:flex-1">
      <ConversationList
        items={data}
        loading={loading}
        problem={problem}
        filter={filter}
        attentionCount={attentionCount}
        selectedId={selectedId}
        now={now}
        onFilter={setFilter}
        onSelect={select}
        onRetry={reload}
        className={cn("w-full shrink-0 border-r lg:w-[23.5rem]", selectedId && "hidden lg:flex")}
      />

      <section aria-label="Hội thoại" className={cn("min-w-0 flex-1", !selectedId && "hidden lg:block")}>
        <AnimatePresence mode="wait" initial={false}>
          {selectedId ? (
            <motion.div
              key={selectedId}
              className="h-full"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: easeOut }}
            >
              <ConversationView conversationId={selectedId} version={version} now={now} onBack={() => select(null)} onChanged={refreshAll} />
            </motion.div>
          ) : (
            <motion.div key="empty" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NoConversation attentionCount={attentionCount} onShowAttention={() => setFilter("attention")} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

/** Khung giữa khi chưa chọn hội thoại: giải thích ba trạng thái và nhắc khách đang chờ. */
function NoConversation({ attentionCount, onShowAttention }: { attentionCount: number; onShowAttention: () => void }) {
  return (
    <div className="relative isolate flex h-full flex-col items-center justify-center gap-6 overflow-hidden bg-canvas px-6 text-center">

      <span aria-hidden className="flex size-12 items-center justify-center rounded-xl bg-muted text-foreground/70">
        <MessagesSquare className="size-6" />
      </span>

      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">Chọn một hội thoại để xem</h2>
        <p className="text-sm text-pretty text-muted-foreground">Bot trả lời khách 24/7. Bạn chỉ cần vào khi khách cần người thật.</p>
      </div>

      <ul className="grid w-full max-w-lg gap-2 text-left sm:grid-cols-3">
        <Legend icon={Bot} tone="bg-ai" title="Bot đang trả lời" text="Không cần làm gì." />
        <Legend icon={Hand} tone="bg-warning" title="Cần bạn" text="Khách chờ nhân viên." />
        <Legend icon={MessagesSquare} tone="bg-primary" title="Nhân viên xử lý" text="Bot đã dừng." />
      </ul>

      {attentionCount > 0 && (
        <button
          type="button"
          onClick={onShowAttention}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-warning/10 px-4 text-sm font-semibold text-warning ring-1 ring-warning/25 transition-colors hover:bg-warning/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-warning motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-warning" />
          </span>
          Xem {attentionCount} khách đang chờ bạn
        </button>
      )}
    </div>
  );
}

function Legend({ icon: Icon, tone, title, text }: { icon: typeof Bot; tone: string; title: string; text: string }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border bg-card/80 p-2.5 shadow-card backdrop-blur">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-white", tone)} aria-hidden>
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="text-[11px] text-muted-foreground">{text}</span>
      </span>
    </li>
  );
}
