"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Bot, CircleAlert, Hand, HelpCircle, LoaderCircle, MessageSquarePlus, RotateCcw, SendHorizontal, Siren, Trash2 } from "lucide-react";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ChatConversation, type ChatMessage } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { BotStyleForm } from "./bot-style-form";
import { formatUsd, formatVnd, handoffReasonLabel } from "./labels";
import { TracePanel } from "./trace-panel";

const maxLength = 1000;
const pollMs = 1500;
/** Quá thời gian này chưa có trả lời → nhắc kiểm tra Worker. */
const slowAfterMs = 45_000;
const medicalIndustries = new Set(["spa", "nha-khoa"]);

const suggestions = [
  "Massage body 60 phút giá bao nhiêu?",
  "Bên mình có những chi nhánh nào, mấy giờ đóng cửa?",
  "Mình bị thoát vị đĩa đệm, bấm huyệt có khỏi hẳn không?",
  "Bấm huyệt xong em thấy khó thở và tức ngực",
  "Cho mình gặp nhân viên tư vấn",
  "Đặt lịch chiều mai 3h, số mình 0912345678",
];

type Profile = { botName: string; industrySlug: string };

export function ChatTestPage() {
  const { me } = useSession();
  const tenantId = me.currentTenant?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProblem, setLoadProblem] = useState<ApiProblem | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  /** Mốc chờ (waitingSince) đã quá lâu — so với mốc hiện tại để biết còn đúng lượt chờ này không. */
  const [slowFor, setSlowFor] = useState<number | null>(null);
  const [sideTab, setSideTab] = useState("trace");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastBotId = useRef<string | null>(null);

  const show = useCallback((next: ChatConversation) => {
    setConversation(next);
    const bots = next.messages.filter((m) => m.sender !== "customer" && m.trace);
    const newest = bots.at(-1)?.id ?? null;
    // Có câu trả lời mới → tự mở phần giải thích của câu đó.
    if (newest && newest !== lastBotId.current) setSelectedId(newest);
    lastBotId.current = newest;
    setWaitingSince((since) => (next.waitingForBot ? (since ?? Date.now()) : null));
  }, []);

  // Tải cài đặt bot + hội thoại thử gần nhất.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadProblem(null);
      const [settings, list] = await Promise.all([call(() => api.GET("/tenant/settings")), call(() => api.GET("/chat-test/conversations"))]);
      if (cancelled) return;
      if (!settings.ok) return (setLoadProblem(settings.problem), setLoading(false));
      if (!list.ok) return (setLoadProblem(list.problem), setLoading(false));
      setProfile({ botName: settings.data.botName, industrySlug: settings.data.industrySlug });
      lastBotId.current = null;
      setSelectedId(null);
      const latest = list.data[0];
      if (latest) {
        const detail = await call(() => api.GET("/chat-test/conversations/{conversationId}", { params: { path: { conversationId: latest.id } } }));
        if (cancelled) return;
        if (detail.ok) show(detail.data);
        else setLoadProblem(detail.problem);
      } else {
        setConversation(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, show]);

  const refresh = useCallback(async () => {
    if (!conversation) return;
    const result = await call(() =>
      api.GET("/chat-test/conversations/{conversationId}", { params: { path: { conversationId: conversation.id } } }),
    );
    if (result.ok) show(result.data);
  }, [conversation, show]);

  // Bot đang xử lý → hỏi lại định kỳ cho tới khi có trả lời. Nhân viên đang xử lý → hỏi lại chậm hơn để thấy tin nhân viên gửi.
  const waiting = Boolean(conversation?.waitingForBot);
  const humanMode = conversation?.mode === "human";
  useEffect(() => {
    if (!waiting && !humanMode) return;
    const timer = setInterval(() => void refresh(), waiting ? pollMs : 3000);
    return () => clearInterval(timer);
  }, [waiting, humanMode, refresh]);

  useEffect(() => {
    if (waitingSince === null) return;
    const timer = setTimeout(() => setSlowFor(waitingSince), Math.max(0, waitingSince + slowAfterMs - Date.now()));
    return () => clearTimeout(timer);
  }, [waitingSince]);

  // Cuộn xuống tin mới nhất.
  const messageCount = conversation?.messages.length ?? 0;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messageCount, waiting]);

  async function startNew() {
    setBusy(true);
    setActionProblem(null);
    const result = await call(() => api.POST("/chat-test/conversations"));
    setBusy(false);
    if (!result.ok) return setActionProblem(result.problem);
    lastBotId.current = null;
    setSelectedId(null);
    show(result.data);
    inputRef.current?.focus();
  }

  async function remove() {
    if (!conversation) return;
    setBusy(true);
    setActionProblem(null);
    const result = await call(() =>
      api.DELETE("/chat-test/conversations/{conversationId}", { params: { path: { conversationId: conversation.id } } }),
    );
    setBusy(false);
    if (!result.ok) return setActionProblem(result.problem);
    setConversation(null);
    setSelectedId(null);
  }

  async function returnToBot() {
    if (!conversation) return;
    setBusy(true);
    setActionProblem(null);
    const result = await call(() =>
      api.POST("/chat-test/conversations/{conversationId}/return-to-bot", { params: { path: { conversationId: conversation.id } } }),
    );
    setBusy(false);
    if (result.ok) show(result.data);
    else setActionProblem(result.problem);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setActionProblem(null);

    let current = conversation;
    if (!current) {
      const created = await call(() => api.POST("/chat-test/conversations"));
      if (!created.ok) {
        setSending(false);
        return setActionProblem(created.problem);
      }
      current = created.data;
      lastBotId.current = null;
    }

    const conversationId = current.id;
    const result = await call(() =>
      api.POST("/chat-test/conversations/{conversationId}/messages", { params: { path: { conversationId } }, body: { text: content } }),
    );
    setSending(false);
    if (!result.ok) return setActionProblem(result.problem);

    setDraft("");
    show({ ...current, waitingForBot: true, messages: [...current.messages, result.data] });
    inputRef.current?.focus();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter gửi, Shift+Enter xuống dòng (không gửi khi đang gõ dấu tiếng Việt bằng bộ gõ).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Đang tải chat thử" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="h-[32rem] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="hidden h-[32rem] animate-pulse rounded-lg bg-muted motion-reduce:animate-none lg:block" />
      </div>
    );
  }

  if (loadProblem) return <ErrorState problem={loadProblem} onRetry={() => window.location.reload()} />;

  const slow = waitingSince !== null && slowFor === waitingSince;
  const botName = profile?.botName ?? "Bot";
  const isHuman = conversation?.mode === "human";
  const urgent = conversation?.urgency === "urgent";
  const selected = conversation?.messages.find((m) => m.id === selectedId) ?? null;
  const messages = conversation?.messages ?? [];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* Khung chat */}
      <section aria-label="Khung chat thử" className="flex h-[calc(100dvh-12rem)] min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="size-5" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{botName}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {conversation ? (
                isHuman ? (
                  <Badge variant={urgent ? "destructive" : "warning"}>{urgent ? "Khẩn cấp: đã chuyển nhân viên" : "Đã chuyển nhân viên"}</Badge>
                ) : (
                  <Badge variant="success">Bot đang trả lời</Badge>
                )
              ) : (
                "Chưa bắt đầu"
              )}
            </span>
          </div>
          {conversation && conversation.aiCalls > 0 && (
            <span className="tabular hidden text-xs text-muted-foreground sm:inline" title="Chi phí gọi AI của cuộc trò chuyện này">
              Chi phí AI {formatUsd(conversation.costUsd)} (~{formatVnd(conversation.costUsd)}) · {conversation.aiCalls} lần gọi
            </span>
          )}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => void startNew()} disabled={busy || sending}>
              <MessageSquarePlus aria-hidden />
              <span className="hidden sm:inline">Cuộc mới</span>
              <span className="sr-only sm:hidden">Bắt đầu cuộc trò chuyện mới</span>
            </Button>
            {conversation && (
              <Button variant="ghost" size="icon-sm" onClick={() => void remove()} disabled={busy || sending} aria-label="Xóa cuộc trò chuyện thử này">
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
        </header>

        <ol ref={listRef} aria-label="Tin nhắn" aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-5">
          {messages.length === 0 && (
            <li className="m-auto flex max-w-md flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Bot className="size-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">Đóng vai khách hàng và nhắn thử cho bot</p>
                <p className="text-sm text-pretty text-muted-foreground">
                  Bot trả lời theo kho kiến thức và cài đặt của bạn, y như khi khách nhắn qua Zalo. Thử cả câu khó để kiểm tra bot có chuyển nhân viên đúng lúc.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="h-auto min-h-9 font-normal whitespace-normal" onClick={() => void send(s)} disabled={sending}>
                    {s}
                  </Button>
                ))}
              </div>
            </li>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              botName={botName}
              selected={m.id === selectedId}
              onExplain={() => {
                setSelectedId(m.id);
                setSideTab("trace");
              }}
            />
          ))}

          {waiting && (
            <li className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              {botName} đang trả lời...
            </li>
          )}
        </ol>

        {slow && waiting && (
          <Alert className="rounded-none border-x-0 border-b-0">
            <CircleAlert aria-hidden />
            <AlertDescription>
              Bot trả lời lâu hơn bình thường. Kiểm tra Worker có đang chạy (cửa sổ <span className="font-mono">dotnet run --project src/ZaloAi.Worker</span>).
            </AlertDescription>
          </Alert>
        )}

        {isHuman && (
          <Alert variant={urgent ? "destructive" : "default"} className="rounded-none border-x-0 border-b-0">
            {urgent ? <Siren aria-hidden /> : <Hand aria-hidden />}
            <AlertTitle>{urgent ? "Bot đã chuyển khẩn cấp cho nhân viên" : "Bot đã chuyển cuộc trò chuyện cho nhân viên"}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {conversation?.handoffReason ? `Lý do: ${handoffReasonLabel(conversation.handoffReason)}. ` : ""}
                Bot đã dừng. Mở <a href="/inbox" target="_blank" rel="noopener" className="font-medium underline underline-offset-2">Hộp thư</a> ở tab khác để trả
                lời như nhân viên, hoặc tiếp tục nhắn ở đây như khách.
              </span>
              <Button size="sm" variant="outline" onClick={() => void returnToBot()} disabled={busy} className="shrink-0">
                <RotateCcw aria-hidden />
                Trả lại cho bot
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {actionProblem && (
          <div role="alert" className="flex items-center gap-2 border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {problemMessage(actionProblem)}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t bg-card p-3">
          <label htmlFor="chat-input" className="sr-only">
            Tin nhắn của khách
          </label>
          <Textarea
            ref={inputRef}
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={maxLength}
            rows={1}
            placeholder="Nhập tin như khách hàng... (Enter để gửi, Shift+Enter xuống dòng)"
            className="max-h-36 min-h-11 resize-none"
          />
          <Button type="submit" size="icon-lg" className="size-11 shrink-0" disabled={sending || !draft.trim()} aria-label="Gửi tin">
            {sending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <SendHorizontal aria-hidden />}
          </Button>
        </form>
      </section>

      {/* Giải thích + giọng văn */}
      <aside aria-label="Giải thích và giọng văn" className="rounded-lg border bg-card lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
        <Tabs value={sideTab} onValueChange={setSideTab} className="gap-0">
          <div className="border-b px-3">
            <TabsList variant="line" className="group-data-horizontal/tabs:h-11">
              <TabsTrigger value="trace">
                <HelpCircle aria-hidden />
                Vì sao trả lời vậy?
              </TabsTrigger>
              <TabsTrigger value="style">Giọng văn</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="trace" className="p-4">
            <TracePanel trace={selected?.trace ?? null} medicalSafety={medicalIndustries.has(profile?.industrySlug ?? "")} />
          </TabsContent>
          <TabsContent value="style" className="p-4">
            <BotStyleForm />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

function MessageBubble({
  message,
  botName,
  selected,
  onExplain,
}: {
  message: ChatMessage;
  botName: string;
  selected: boolean;
  onExplain: () => void;
}) {
  const fromCustomer = message.sender === "customer";
  const time = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (message.sender === "system") {
    return (
      <li className="mx-auto max-w-[85%] rounded-md border border-dashed bg-card px-3 py-2 text-center text-xs text-pretty whitespace-pre-wrap text-muted-foreground">
        {message.text}
      </li>
    );
  }

  return (
    <li className={cn("flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]", fromCustomer ? "items-end self-end" : "items-start self-start")}>
      <span className="sr-only">{fromCustomer ? "Khách:" : message.sender === "staff" ? "Nhân viên:" : `${botName}:`}</span>
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
          fromCustomer ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card",
          message.sender === "staff" && "border-success/40 bg-success/5",
          selected && !fromCustomer && "ring-2 ring-primary/40",
        )}
      >
        <Linkified text={message.text} inverted={fromCustomer} />
      </div>
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        {message.sender === "staff" && <span className="font-medium text-success">Nhân viên</span>}
        <time dateTime={message.createdAt} className="tabular">
          {time}
        </time>
        {!fromCustomer && message.trace && (
          <button
            type="button"
            onClick={onExplain}
            aria-pressed={selected}
            className={cn(
              "inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-sm px-1 font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "underline",
            )}
          >
            <HelpCircle className="size-3.5" aria-hidden />
            Vì sao trả lời vậy?
          </button>
        )}
      </div>
    </li>
  );
}

/** Hiện link https trong tin (ví dụ link chính sách bảo mật) thành thẻ a an toàn, không dùng innerHTML. */
function Linkified({ text, inverted }: { text: string; inverted: boolean }): ReactNode {
  const parts = text.split(/(https:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith("https://") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("break-all underline underline-offset-2", inverted ? "text-primary-foreground" : "text-primary")}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
