"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  CircleAlert,
  Coins,
  Hand,
  HelpCircle,
  LoaderCircle,
  Megaphone,
  MessageSquarePlus,
  Palette,
  RotateCcw,
  SendHorizontal,
  Siren,
  Trash2,
  UserRound,
} from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ChatConversation, type ChatMessage } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { fadeUp, spring, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BotStyleForm } from "./bot-style-form";
import { formatUsd, formatVnd, handoffReasonLabel } from "./labels";
import { runPositions, type RunPosition } from "./thread";
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

/**
 * Chat thử: khung chat giống Hộp thư / Zalo (nền lưới chấm, bong bóng gom cụm) — người thử đóng vai khách ở bên phải,
 * trợ lý AI bên trái (nền tím nhạt). Bên phải màn rộng: giải thích câu trả lời + giọng văn.
 */
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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastBotId = useRef<string | null>(null);
  const scrolledOnce = useRef(false);

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

  // Cuộn xuống tin mới nhất (lần đầu nhảy thẳng, sau đó cuộn mượt).
  const messageCount = conversation?.messages.length ?? 0;
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: scrolledOnce.current ? "smooth" : "auto" });
    scrolledOnce.current = true;
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
      <div role="status" aria-label="Đang tải chat thử" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex h-[32rem] flex-col overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="skeleton size-10 rounded-xl" />
            <div className="flex flex-col gap-2">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-2.5 w-40 opacity-70" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4 bg-canvas p-6">
            {[55, 35, 65, 40].map((w, i) => (
              <div key={i} className={cn("skeleton h-10 rounded-2xl", i % 2 ? "self-end" : "self-start")} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="skeleton hidden h-[32rem] rounded-2xl lg:block" />
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
  const positions = runPositions(messages);
  const statusText = conversation
    ? isHuman
      ? urgent
        ? "Khẩn cấp: đã chuyển nhân viên"
        : "Đã chuyển nhân viên"
      : waiting
        ? "Đang soạn trả lời..."
        : "Bot đang trả lời"
    : "Chưa bắt đầu · nhắn tin đầu tiên để thử";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* Khung chat */}
      <section
        aria-label="Khung chat thử"
        className="flex h-[calc(100dvh-13rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border bg-card shadow-card"
      >
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <span className="relative">
            <IconTile icon={Bot} tone="ai" variant="solid" size="md" />
            <span
              className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card", isHuman ? (urgent ? "bg-destructive" : "bg-warning") : "bg-success")}
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{botName}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <StatusDot tone={isHuman ? (urgent ? "destructive" : "warning") : "ai"} pulse={!isHuman && Boolean(conversation)} />
              <span className="truncate">{statusText}</span>
            </span>
          </div>
          {conversation && conversation.aiCalls > 0 && (
            <span
              className="tabular hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground xl:inline-flex"
              title="Chi phí gọi AI của cuộc trò chuyện này"
            >
              <Coins className="size-3.5" aria-hidden />
              {formatUsd(conversation.costUsd)} (~{formatVnd(conversation.costUsd)}) · {conversation.aiCalls} lần gọi
            </span>
          )}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void startNew()} disabled={busy || sending}>
              <MessageSquarePlus aria-hidden />
              <span className="hidden sm:inline">Cuộc mới</span>
              <span className="sr-only sm:hidden">Bắt đầu cuộc trò chuyện mới</span>
            </Button>
            {conversation && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void remove()}
                disabled={busy || sending}
                aria-label="Xóa cuộc trò chuyện thử này"
                title="Xóa cuộc trò chuyện thử"
              >
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
        </header>

        <div ref={listRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-canvas bg-dot-grid">
          <ol aria-label="Tin nhắn" aria-live="polite" className="mx-auto flex min-h-full max-w-3xl flex-col px-3 pt-4 pb-6 sm:px-6">
            {messages.length === 0 && (
              <li className="m-auto flex max-w-lg flex-col items-center gap-5 py-8 text-center">
                <div aria-hidden className="relative flex size-28 items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-dashed border-primary/20" />
                  <span className="absolute inset-4 rounded-full border border-primary/15 bg-primary/5" />
                  <IconTile icon={Bot} tone="ai" variant="solid" size="lg" className="animate-float-slow motion-reduce:animate-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-base font-semibold tracking-tight">Đóng vai khách hàng và nhắn thử cho bot</p>
                  <p className="text-sm text-pretty text-muted-foreground">
                    Bot trả lời theo kho kiến thức và cài đặt của bạn, y như khi khách nhắn qua Zalo. Thử cả câu khó để kiểm tra bot có chuyển nhân viên
                    đúng lúc.
                  </p>
                </div>
                <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <motion.button
                      key={s}
                      type="button"
                      variants={fadeUp}
                      onClick={() => void send(s)}
                      disabled={sending}
                      className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-left text-[13px] shadow-card transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-11"
                    >
                      <Bot className="size-3.5 shrink-0 text-primary" aria-hidden />
                      {s}
                    </motion.button>
                  ))}
                </motion.div>
              </li>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  position={positions[i]}
                  botName={botName}
                  selected={m.id === selectedId}
                  onExplain={() => {
                    setSelectedId(m.id);
                    setSideTab("trace");
                  }}
                />
              ))}

              {waiting && (
                <motion.li
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="mt-3 flex items-end gap-2"
                >
                  <SideAvatar sender="bot" />
                  <span className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-ai/15 bg-ai-soft px-4 py-3 text-sm text-muted-foreground">
                    <span className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="size-1.5 animate-bounce rounded-full bg-ai/70 motion-reduce:animate-none"
                          style={{ animationDelay: `${d * 150}ms` }}
                        />
                      ))}
                    </span>
                    {botName} đang trả lời...
                  </span>
                </motion.li>
              )}
            </AnimatePresence>
          </ol>
        </div>

        {slow && waiting && (
          <div role="status" className="flex shrink-0 items-start gap-3 border-t bg-warning/[0.07] px-4 py-2.5">
            <IconTile icon={CircleAlert} tone="warning" size="sm" />
            <p className="text-sm text-pretty">
              Bot trả lời lâu hơn bình thường. Kiểm tra Worker có đang chạy (cửa sổ{" "}
              <span className="rounded-sm bg-muted px-1 font-mono text-xs">dotnet run --project src/ZaloAi.Worker</span>).
            </p>
          </div>
        )}

        {isHuman && (
          <div
            role="status"
            className={cn(
              "flex shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center",
              urgent ? "bg-destructive/[0.06]" : "bg-warning/[0.08]",
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <IconTile icon={urgent ? Siren : Hand} tone={urgent ? "destructive" : "warning"} variant="solid" size="sm" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className={cn("text-sm font-semibold", urgent ? "text-destructive" : "text-warning")}>
                  {urgent ? "Bot đã chuyển khẩn cấp cho nhân viên" : "Bot đã chuyển cuộc trò chuyện cho nhân viên"}
                </p>
                <p className="text-xs text-pretty text-muted-foreground">
                  {conversation?.handoffReason ? `Lý do: ${handoffReasonLabel(conversation.handoffReason)}. ` : ""}
                  Bot đã dừng. Mở{" "}
                  <a href="/inbox" target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2">
                    Hộp thư
                  </a>{" "}
                  ở tab khác để trả lời như nhân viên, hoặc tiếp tục nhắn ở đây như khách.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void returnToBot()} disabled={busy} className="shrink-0 self-start sm:self-center">
              <RotateCcw aria-hidden />
              Trả lại cho bot
            </Button>
          </div>
        )}

        {actionProblem && (
          <div role="alert" className="flex shrink-0 items-center gap-2 border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {problemMessage(actionProblem)}
          </div>
        )}

        <form onSubmit={onSubmit} className="shrink-0 border-t bg-card px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
            <div className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 pl-4 shadow-card transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-ring/25">
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
                placeholder="Nhập tin như khách hàng..."
                className="max-h-36 min-h-10 flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={sending || !draft.trim()} aria-label="Gửi tin">
                {sending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <SendHorizontal aria-hidden />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
              <span>Enter để gửi · Shift+Enter xuống dòng</span>
              {draft.length > maxLength * 0.8 && (
                <span className={cn("tabular shrink-0", draft.length >= maxLength && "font-medium text-destructive")}>
                  {draft.length}/{maxLength}
                </span>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Giải thích + giọng văn */}
      <aside
        aria-label="Giải thích và giọng văn"
        className="scrollbar-thin overflow-hidden rounded-2xl border bg-card shadow-card lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
      >
        <Tabs value={sideTab} onValueChange={setSideTab} className="gap-0">
          <div className="sticky top-0 z-10 border-b bg-card/95 px-4 backdrop-blur">
            <TabsList variant="line" className="group-data-horizontal/tabs:h-12">
              <TabsTrigger value="trace">
                <HelpCircle aria-hidden />
                Vì sao trả lời vậy?
              </TabsTrigger>
              <TabsTrigger value="style">
                <Palette aria-hidden />
                Giọng văn
              </TabsTrigger>
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

function StatusDot({ tone, pulse }: { tone: "ai" | "warning" | "destructive"; pulse: boolean }) {
  const color = tone === "ai" ? "bg-ai" : tone === "warning" ? "bg-warning" : "bg-destructive";
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      {pulse && <span className={cn("absolute inset-0 animate-ping-soft rounded-full motion-reduce:hidden", color)} />}
      <span className={cn("relative size-2 rounded-full", color)} />
    </span>
  );
}

/** Ảnh đại diện nhỏ bên trái: trợ lý AI (tím) hoặc nhân viên (xanh lá). */
function SideAvatar({ sender }: { sender: "bot" | "staff" }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-background",
        sender === "bot" ? "bg-primary" : "bg-success",
      )}
      aria-hidden
    >
      {sender === "bot" ? <Bot className="size-4" /> : <UserRound className="size-4" />}
    </span>
  );
}

/** Bo góc theo vị trí trong cụm: góc sát ảnh đại diện/cạnh cụm nhỏ lại. */
const corners: Record<"left" | "right", Record<RunPosition, string>> = {
  left: { single: "rounded-2xl rounded-bl-md", first: "rounded-2xl rounded-bl-md", middle: "rounded-2xl rounded-l-md", last: "rounded-2xl rounded-tl-md" },
  right: { single: "rounded-2xl rounded-br-md", first: "rounded-2xl rounded-br-md", middle: "rounded-2xl rounded-r-md", last: "rounded-2xl rounded-tr-md" },
};

function MessageBubble({
  message,
  position,
  botName,
  selected,
  onExplain,
}: {
  message: ChatMessage;
  position: RunPosition;
  botName: string;
  selected: boolean;
  onExplain: () => void;
}) {
  const fromCustomer = message.sender === "customer";
  const time = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const startsRun = position === "single" || position === "first";
  const endsRun = position === "single" || position === "last";

  if (message.sender === "system") {
    return (
      <motion.li layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-3 flex justify-center">
        <span className="flex max-w-[88%] items-start gap-2 rounded-2xl border border-dashed bg-card/85 px-3.5 py-2 text-xs text-pretty whitespace-pre-wrap text-muted-foreground backdrop-blur">
          <Megaphone className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{message.text}</span>
        </span>
      </motion.li>
    );
  }

  const side = fromCustomer ? "right" : "left";
  const staff = message.sender === "staff";
  const showMeta = endsRun || Boolean(!fromCustomer && message.trace);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={cn("flex w-full gap-2", fromCustomer ? "justify-end" : "justify-start", startsRun ? "mt-3" : "mt-0.5")}
    >
      {!fromCustomer && <div className="flex w-8 shrink-0 items-end">{endsRun && <SideAvatar sender={staff ? "staff" : "bot"} />}</div>}

      <div className={cn("flex max-w-[84%] min-w-0 flex-col gap-1 sm:max-w-[72%]", fromCustomer ? "items-end" : "items-start")}>
        <span className="sr-only">{fromCustomer ? "Khách:" : staff ? "Nhân viên:" : `${botName}:`}</span>
        {!fromCustomer && startsRun && (
          <span className={cn("flex items-center gap-1 px-1 text-[11px] font-semibold", staff ? "text-success" : "text-ai")} aria-hidden>
            {staff ? <UserRound className="size-3" /> : <Bot className="size-3" />}
            {staff ? "Nhân viên" : `Trợ lý AI · ${botName}`}
          </span>
        )}
        <div
          className={cn(
            "px-3.5 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap transition-shadow",
            corners[side][position],
            fromCustomer && "bg-active-gradient text-white shadow-sm",
            message.sender === "bot" && "border border-ai/15 bg-ai-soft text-foreground",
            staff && "border border-success/25 bg-card text-foreground shadow-card",
            selected && !fromCustomer && "ring-2 ring-ai/50 ring-offset-2 ring-offset-canvas",
          )}
        >
          <Linkified text={message.text} inverted={fromCustomer} />
        </div>
        {showMeta && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-muted-foreground">
            {endsRun && (
              <time dateTime={message.createdAt} className="tabular">
                {time}
              </time>
            )}
            {!fromCustomer && message.trace && (
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
                Vì sao trả lời vậy?
              </button>
            )}
          </div>
        )}
      </div>
    </motion.li>
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
        className={cn("break-all underline underline-offset-2", inverted ? "text-white" : "text-primary")}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
