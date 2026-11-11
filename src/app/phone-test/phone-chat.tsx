"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleAlert, Headset, SendHorizontal, SquarePen } from "lucide-react";
import { call } from "@/lib/api/call";
import { api, type ChatConversation } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { initials, toRows, type Bubble } from "@/lib/phone-chat";
import { cn } from "@/lib/utils";

const maxLength = 1000;
/** Bot đang trả lời (còn tin chờ gửi) → hỏi lại nhanh; bình thường vẫn hỏi lại để thấy tin bot tự nhắn / nhân viên trả lời. */
const fastPollMs = 1200;
const slowPollMs = 4000;

const starters = ["Bên mình có những gói nào vậy?", "Giá massage 60 phút bao nhiêu em?", "Cho mình đặt lịch chiều mai nhé"];

/**
 * Giao diện chat như trên điện thoại của KHÁCH (trang /phone-test). Dùng cùng luồng với Chat thử (hàng đợi → AI → nhiều tin ngắn
 * gửi lần lượt → chuyển nhân viên), chỉ hiện những tin khách thật sự nhận được. Hội thoại vẫn là "Chat thử": không tính vào
 * dashboard/hạn mức. Không dùng logo hay thương hiệu Zalo.
 */
export function PhoneChat() {
  const router = useRouter();
  const [business, setBusiness] = useState<{ name: string; botName: string } | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handle = useCallback((p: ApiProblem) => {
    if (p.status === 401) {
      router.replace("/login?next=/phone-test");
      return;
    }
    setProblem(p);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [settings, list] = await Promise.all([call(() => api.GET("/tenant/settings")), call(() => api.GET("/chat-test/conversations"))]);
      if (cancelled) return;
      if (!settings.ok) return handle(settings.problem);
      if (!list.ok) return handle(list.problem);
      setBusiness({ name: settings.data.name, botName: settings.data.botName });
      const latest = list.data[0];
      if (!latest) return;
      const detail = await call(() => api.GET("/chat-test/conversations/{conversationId}", { params: { path: { conversationId: latest.id } } }));
      if (cancelled) return;
      if (detail.ok) setConversation(detail.data);
      else handle(detail.problem);
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const conversationId = conversation?.id;
  const waiting = Boolean(conversation?.waitingForBot);
  useEffect(() => {
    if (!conversationId) return;
    const timer = setInterval(async () => {
      const result = await call(() => api.GET("/chat-test/conversations/{conversationId}", { params: { path: { conversationId } } }));
      if (result.ok) setConversation(result.data);
    }, waiting ? fastPollMs : slowPollMs);
    return () => clearInterval(timer);
  }, [conversationId, waiting]);

  const count = conversation?.messages.length ?? 0;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [count, waiting]);

  async function newChat() {
    setProblem(null);
    const created = await call(() => api.POST("/chat-test/conversations"));
    if (!created.ok) return handle(created.problem);
    setConversation(created.data);
    inputRef.current?.focus();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setProblem(null);
    let current = conversation;
    if (!current) {
      const created = await call(() => api.POST("/chat-test/conversations"));
      if (!created.ok) {
        setSending(false);
        return handle(created.problem);
      }
      current = created.data;
    }

    const result = await call(() =>
      api.POST("/chat-test/conversations/{conversationId}/messages", { params: { path: { conversationId: current.id } }, body: { text: content } }),
    );
    setSending(false);
    if (!result.ok) return handle(result.problem);
    setDraft("");
    setConversation({ ...current, waitingForBot: true, messages: [...current.messages, result.data] });
    inputRef.current?.focus();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter gửi, Shift+Enter xuống dòng; không gửi khi bộ gõ tiếng Việt đang ghép dấu.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  const name = business?.name ?? "Doanh nghiệp";
  const avatar = initials(name);
  const rows = toRows(conversation?.messages ?? []);
  const last = conversation?.messages.at(-1);

  return (
    <div className="flex min-h-dvh items-stretch justify-center bg-muted sm:items-center sm:py-6">
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background sm:h-[min(860px,94dvh)] sm:w-[400px] sm:rounded-[2rem] sm:border-[10px] sm:border-foreground/85 sm:shadow-2xl">
        <header className="flex h-14 shrink-0 items-center gap-1 bg-primary px-1 text-primary-foreground">
          <Link
            href="/chat-test"
            aria-label="Về trang Chat thử"
            className="flex size-11 items-center justify-center rounded-full hover:bg-primary-foreground/15 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:outline-none"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <Avatar text={avatar} className="size-9 bg-primary-foreground/20 text-sm" />
          <div className="ml-2 flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] leading-tight font-semibold">{name}</span>
            <span className="truncate text-xs text-primary-foreground/80">{waiting ? "Đang soạn tin…" : "Trợ lý AI · thường trả lời ngay"}</span>
          </div>
          <button
            type="button"
            onClick={() => void newChat()}
            aria-label="Cuộc chat mới (đóng vai khách mới)"
            title="Cuộc chat mới (khách mới)"
            className="flex size-11 items-center justify-center rounded-full hover:bg-primary-foreground/15 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:outline-none"
          >
            <SquarePen className="size-5" aria-hidden />
          </button>
        </header>

        <p className="shrink-0 bg-accent px-3 py-1.5 text-center text-xs text-accent-foreground">
          Bạn đang đóng vai khách. Tin đi qua đúng luồng bot thật, không gửi lên Zalo.
        </p>

        <div ref={listRef} role="log" aria-live="polite" aria-label="Tin nhắn" className="flex flex-1 flex-col gap-0.5 overflow-y-auto bg-muted/70 px-3 py-3">
          {rows.length === 0 ? (
            <div className="m-auto flex max-w-xs flex-col items-center gap-3 text-center">
              <Avatar text={avatar} className="size-16 bg-primary text-xl text-primary-foreground" />
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">Gửi tin nhắn đầu tiên như một khách hàng mới.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="min-h-11 rounded-full border border-primary/30 bg-card px-3 py-2 text-sm text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            rows.map((row) =>
              row.kind === "time" ? (
                <p key={row.key} className="my-2 self-center rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {row.label}
                </p>
              ) : (
                <MessageBubble key={row.key} bubble={row.bubble} avatar={avatar} />
              ),
            )
          )}
          {waiting && <Typing avatar={avatar} />}
          {!waiting && last?.sender === "customer" && conversation?.mode !== "human" && (
            <p className="self-end pr-1 text-[11px] text-muted-foreground">Đã gửi</p>
          )}
          {conversation?.mode === "human" && (
            <p className="mt-3 flex items-center gap-1.5 self-center rounded-md border border-dashed border-foreground/20 bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <Headset className="size-3.5 shrink-0" aria-hidden />
              (Chỉ bạn thấy) Đã chuyển nhân viên — trả lời từ Hộp thư.
            </p>
          )}
        </div>

        {problem && (
          <p role="alert" className="flex shrink-0 items-center gap-1.5 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {problemMessage(problem)}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t bg-card px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <label htmlFor="phone-input" className="sr-only">
            Tin nhắn
          </label>
          <textarea
            id="phone-input"
            ref={inputRef}
            rows={1}
            maxLength={maxLength}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tin nhắn"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl bg-muted px-4 py-2.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Gửi"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

function Avatar({ text, className }: { text: string; className?: string }) {
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", className)}>
      {text}
    </span>
  );
}

function MessageBubble({ bubble, avatar }: { bubble: Bubble; avatar: string }) {
  const mine = bubble.side === "me";
  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", bubble.firstOfGroup && "mt-2")}>
      {!mine &&
        (bubble.lastOfGroup ? <Avatar text={avatar} className="size-7 bg-primary text-[11px] text-primary-foreground" /> : <span className="w-7 shrink-0" />)}
      <div
        className={cn(
          "max-w-[78%] px-3 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap shadow-xs",
          mine ? "rounded-2xl rounded-br-md bg-primary/12 text-foreground" : "rounded-2xl rounded-bl-md border bg-card text-card-foreground",
          !bubble.lastOfGroup && (mine ? "rounded-br-2xl" : "rounded-bl-2xl"),
        )}
      >
        {bubble.text}
      </div>
    </div>
  );
}

function Typing({ avatar }: { avatar: string }) {
  return (
    <div className="mt-2 flex items-end gap-2" role="status" aria-label="Đang soạn tin">
      <Avatar text={avatar} className="size-7 bg-primary text-[11px] text-primary-foreground" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-3 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
