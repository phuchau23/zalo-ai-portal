"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Bot, CheckCheck, CircleAlert, Clock3, HelpCircle, Megaphone, UserRound } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import type { InboxMessage } from "@/lib/api/client";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { buildThread, senderLabels, type RunPosition } from "./inbox-utils";

/** Cách đáy ít hơn mức này thì coi như đang xem tin mới nhất (tin mới đến sẽ tự cuộn xuống). */
const nearBottomPx = 96;

/**
 * Khung tin nhắn kiểu Messenger: nền lưới chấm, nhãn ngày, tin liên tiếp cùng người gửi gom thành cụm
 * (ảnh đại diện khách ở tin cuối cụm, giờ dưới tin cuối cụm).
 * Khách bên trái (thẻ trắng); phía doanh nghiệp bên phải: bot nền tím nhạt (màu AI), nhân viên nền xanh.
 * Đang xem tin cũ mà có tin mới → hiện nút "Tin mới" thay vì kéo người dùng xuống.
 */
export function MessageThread({
  messages,
  contactName,
  staffNames,
  now,
  selectedTraceId,
  onExplain,
}: {
  messages: InboxMessage[];
  contactName: string;
  /** Tên nhân viên theo userId, để nhãn tin ghi "Lan" thay vì "Nhân viên". */
  staffNames: Record<string, string>;
  now: number;
  selectedTraceId: string | null;
  onExplain: (messageId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const seenCount = useRef(0);
  const [showJump, setShowJump] = useState(false);
  const entries = useMemo(() => buildThread(messages, now), [messages, now]);

  // Lần đầu: nhảy thẳng xuống cuối. Có tin mới: đang ở cuối thì cuộn mượt xuống, đang đọc tin cũ thì hiện nút "Tin mới".
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = seenCount.current === 0;
    const grew = messages.length > seenCount.current;
    seenCount.current = messages.length;
    if (first) {
      el.scrollTop = el.scrollHeight;
    } else if (grew) {
      if (nearBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      else setShowJump(true);
    }
  }, [messages.length]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < nearBottomPx;
    if (nearBottom.current) setShowJump(false);
  }

  function jumpToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="scrollbar-thin absolute inset-0 overflow-y-auto bg-canvas bg-dot-grid">
        <ol aria-label="Tin nhắn" aria-live="polite" className="mx-auto flex max-w-3xl flex-col px-3 pt-4 pb-6 sm:px-6">
          <AnimatePresence initial={false}>
            {entries.map((entry) =>
              entry.kind === "day" ? (
                <li key={entry.key} className="sticky top-2 z-10 my-3 flex justify-center">
                  <span className="rounded-full border bg-card/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-card backdrop-blur">
                    {entry.label}
                  </span>
                </li>
              ) : (
                <MessageItem
                  key={entry.message.id}
                  message={entry.message}
                  position={entry.position}
                  contactName={contactName}
                  staffName={entry.message.senderUserId ? staffNames[entry.message.senderUserId] : undefined}
                  selected={entry.message.id === selectedTraceId}
                  onExplain={() => onExplain(entry.message.id)}
                />
              ),
            )}
          </AnimatePresence>
        </ol>
      </div>

      <AnimatePresence>
        {showJump && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <motion.button
              type="button"
              onClick={jumpToLatest}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={spring}
              className="pointer-events-auto flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-active-gradient px-4 text-sm font-medium text-white shadow-glow focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ArrowDown className="size-4" aria-hidden />
              Tin mới
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bo góc theo vị trí trong cụm: góc sát ảnh đại diện/cạnh cụm nhỏ lại, giống ứng dụng nhắn tin. */
const corners: Record<"left" | "right", Record<RunPosition, string>> = {
  left: { single: "rounded-2xl rounded-bl-md", first: "rounded-2xl rounded-bl-md", middle: "rounded-2xl rounded-l-md", last: "rounded-2xl rounded-tl-md" },
  right: { single: "rounded-2xl rounded-br-md", first: "rounded-2xl rounded-br-md", middle: "rounded-2xl rounded-r-md", last: "rounded-2xl rounded-tr-md" },
};

const bubbleTones: Record<string, string> = {
  customer: "border border-border/70 bg-card text-foreground shadow-card",
  bot: "border border-ai/15 bg-ai-soft text-foreground",
  staff: "bg-active-gradient text-white shadow-sm",
};

function MessageItem({
  message,
  position,
  contactName,
  staffName,
  selected,
  onExplain,
}: {
  message: InboxMessage;
  position: RunPosition;
  contactName: string;
  staffName: string | undefined;
  selected: boolean;
  onExplain: () => void;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const startsRun = position === "single" || position === "first";
  const endsRun = position === "single" || position === "last";

  if (message.sender === "system") {
    return (
      <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-3 flex justify-center">
        <span className="flex max-w-[88%] items-start gap-2 rounded-2xl border border-dashed bg-card/85 px-3.5 py-2 text-xs text-pretty whitespace-pre-wrap text-muted-foreground backdrop-blur">
          <Megaphone className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">{senderLabels.system}:</span> {message.text}
          </span>
        </span>
      </motion.li>
    );
  }

  const side = message.sender === "customer" ? "left" : "right";
  const failed = message.deliveryStatus === "failed";
  const pending = message.deliveryStatus === "pending";
  const showMeta = endsRun || failed || Boolean(message.trace);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={cn("flex w-full gap-2", side === "left" ? "justify-start" : "justify-end", startsRun ? "mt-3" : "mt-0.5")}
    >
      {side === "left" && <div className="flex w-8 shrink-0 items-end">{endsRun && <PersonAvatar name={contactName} size="sm" />}</div>}

      <div className={cn("flex max-w-[84%] min-w-0 flex-col gap-1 sm:max-w-[72%]", side === "right" ? "items-end" : "items-start")}>
        {side === "right" && startsRun && <SenderLabel message={message} staffName={staffName} />}
        <div
          className={cn(
            "px-3.5 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap transition-shadow",
            corners[side][position],
            bubbleTones[message.sender] ?? bubbleTones.customer,
            selected && "ring-2 ring-ai/50 ring-offset-2 ring-offset-canvas",
            failed && "opacity-80",
          )}
        >
          {message.text}
        </div>
        {showMeta && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-muted-foreground">
            {endsRun && (
              <time dateTime={message.createdAt} className="tabular">
                {time}
              </time>
            )}
            {message.sender === "staff" && endsRun && !failed && (
              <span className="inline-flex items-center gap-1">
                {pending ? <Clock3 className="size-3" aria-hidden /> : <CheckCheck className="size-3.5 text-primary" aria-hidden />}
                {pending ? "Đang gửi…" : "Đã gửi"}
              </span>
            )}
            {message.sender === "bot" && pending && <span>Đang gửi…</span>}
            {failed && (
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <CircleAlert className="size-3" aria-hidden />
                Không gửi được{message.deliveryError ? ` (${message.deliveryError})` : ""}
              </span>
            )}
            {message.trace && (
              <button
                type="button"
                onClick={onExplain}
                aria-pressed={selected}
                className={cn(
                  "inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-full px-2 font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected ? "bg-ai text-white" : "bg-ai-soft text-ai hover:bg-ai/15",
                )}
              >
                <HelpCircle className="size-3.5" aria-hidden />
                Vì sao bot trả lời vậy?
              </button>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

/** Dòng nhỏ phía trên cụm tin của doanh nghiệp: ai đã gửi (bot / bot chủ động nhắn / nhân viên). */
function SenderLabel({ message, staffName }: { message: InboxMessage; staffName: string | undefined }) {
  if (message.sender === "bot") {
    return (
      <span className="flex items-center gap-1 px-1 text-[11px] font-semibold text-ai">
        {message.proactive ? <Bot className="size-3" aria-hidden /> : <Bot className="size-3" aria-hidden />}
        {message.proactive ? "Bot chủ động nhắn" : "Trợ lý AI"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-1 text-[11px] font-semibold text-primary">
      <UserRound className="size-3" aria-hidden />
      {staffName ?? senderLabels[message.sender] ?? message.sender}
    </span>
  );
}
