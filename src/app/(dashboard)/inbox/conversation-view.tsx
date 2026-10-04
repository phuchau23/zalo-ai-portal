"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, CircleAlert, Hand, HelpCircle, IdCard, LoaderCircle, RotateCcw, SendHorizontal, Siren, UserRound } from "lucide-react";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type InboxMessage } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { useApiData } from "@/lib/use-api-data";
import { leadStatusOf } from "@/lib/customers";
import { cn } from "@/lib/utils";
import { handoffReasonLabel, leadFieldLabel } from "../chat-test/labels";
import { TracePanel } from "../chat-test/trace-panel";
import { elapsed, senderLabels } from "./inbox-utils";

const maxLength = 1900;
const unassigned = "__none__";

export function ConversationView({
  conversationId,
  version,
  now,
  onBack,
  onChanged,
}: {
  conversationId: string;
  version: number;
  now: number;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const { data, problem, loading, reload } = useApiData(() =>
    call(() => api.GET("/inbox/conversations/{conversationId}", { params: { path: { conversationId } } })),
  );
  const { data: members } = useApiData(() => call(() => api.GET("/tenant/members")));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Sự kiện realtime (tin mới, đổi trạng thái) → tải lại.
  useEffect(() => {
    if (version > 0) reload();
  }, [version, reload]);

  const messageCount = data?.messages.length ?? 0;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messageCount]);

  async function act(run: () => Promise<{ ok: boolean; problem?: ApiProblem }>) {
    setBusy(true);
    setActionProblem(null);
    const result = await run();
    setBusy(false);
    if (!result.ok && result.problem) setActionProblem(result.problem);
    reload();
    onChanged();
    return result.ok;
  }

  const path = { params: { path: { conversationId } } };
  const takeOver = () => act(() => call(() => api.POST("/inbox/conversations/{conversationId}/take-over", path)));
  const returnToBot = () => act(() => call(() => api.POST("/inbox/conversations/{conversationId}/return-to-bot", path)));
  const assign = (userId: string) =>
    act(() =>
      call(() =>
        api.POST("/inbox/conversations/{conversationId}/assign", { ...path, body: { userId: userId === unassigned ? null : userId } }),
      ),
    );

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const ok = await act(() => call(() => api.POST("/inbox/conversations/{conversationId}/messages", { ...path, body: { text } })));
    if (ok) setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  if (problem && !data) {
    return (
      <div className="p-4">
        <ErrorState problem={problem} onRetry={reload} />
      </div>
    );
  }

  if (loading && !data) {
    return <div role="status" aria-label="Đang tải hội thoại" className="m-4 h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />;
  }

  if (!data) return null;
  const c = data.conversation;
  const human = c.mode === "human";
  const urgent = c.urgency === "urgent" && Boolean(c.needsAttentionSince);
  const assignee = members?.find((m) => m.userId === c.assignedUserId);
  const selectedTrace = data.messages.find((m) => m.id === traceId)?.trace ?? null;
  const leadEntries = Object.entries(data.leadFields);

  return (
    <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onBack} aria-label="Quay lại danh sách">
            <ArrowLeft />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{c.contactName}</span>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {human ? (
                <Badge variant={urgent ? "destructive" : "warning"}>{urgent ? "Khẩn cấp" : "Nhân viên xử lý"}</Badge>
              ) : (
                <Badge variant="success">Bot đang trả lời</Badge>
              )}
              <Badge variant={leadStatusOf(c.leadStatus).variant}>{leadStatusOf(c.leadStatus).label}</Badge>
              {c.isTest && <Badge variant="outline">Chat thử</Badge>}
              {assignee && <span>Phụ trách: {assignee.name}</span>}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && members && (
              <Select value={c.assignedUserId ?? unassigned} onValueChange={(v) => void assign(v)} disabled={busy}>
                <SelectTrigger size="sm" className="w-40" aria-label="Giao cho nhân viên">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={unassigned}>Chưa giao</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Link href={`/customers/${c.contactId}`} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
              <IdCard aria-hidden />
              Hồ sơ khách
            </Link>
            {human ? (
              <Button size="sm" variant="outline" onClick={() => void returnToBot()} disabled={busy}>
                <RotateCcw aria-hidden />
                Trả lại cho bot
              </Button>
            ) : (
              <Button size="sm" onClick={() => void takeOver()} disabled={busy}>
                <Hand aria-hidden />
                Tiếp quản
              </Button>
            )}
          </div>
        </header>

        {c.needsAttentionSince && (
          <Alert variant={urgent ? "destructive" : "default"} className="rounded-none border-x-0 border-t-0">
            {urgent ? <Siren aria-hidden /> : <Hand aria-hidden />}
            <AlertTitle>
              {urgent ? "Khách có dấu hiệu nguy hiểm — cần liên hệ ngay" : "Khách đang chờ nhân viên"} · {elapsed(c.needsAttentionSince, now)}
            </AlertTitle>
            <AlertDescription>
              {c.handoffReason ? `Lý do: ${handoffReasonLabel(c.handoffReason)}. ` : ""}
              {human ? "Bot đã dừng, hãy trả lời khách." : ""}
            </AlertDescription>
          </Alert>
        )}

        <ol ref={listRef} aria-label="Tin nhắn" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-5">
          {data.messages.map((m) => (
            <Bubble key={m.id} message={m} selected={m.id === traceId} onExplain={() => setTraceId(m.id)} />
          ))}
        </ol>

        {actionProblem && (
          <div role="alert" className="flex items-center gap-2 border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {problemMessage(actionProblem)}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-1.5 border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <label htmlFor="staff-reply" className="sr-only">
              Trả lời khách
            </label>
            <Textarea
              id="staff-reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={maxLength}
              rows={1}
              placeholder="Nhập tin trả lời khách... (Enter để gửi, Shift+Enter xuống dòng)"
              className="max-h-36 min-h-11 resize-none"
            />
            <Button type="submit" size="icon-lg" className="size-11 shrink-0" disabled={busy || !draft.trim()} aria-label="Gửi tin">
              {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <SendHorizontal aria-hidden />}
            </Button>
          </div>
          {!human && <p className="text-xs text-muted-foreground">Gửi tin sẽ tự tiếp quản: bot dừng trả lời hội thoại này cho tới khi bạn trả lại.</p>}
        </form>
      </div>

      <aside aria-label="Thông tin khách" className="hidden min-h-0 flex-col gap-4 overflow-y-auto border-l p-4 xl:flex">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Thông tin khách</h3>
          {leadEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Khách chưa để lại thông tin. Bot sẽ tự ghi lại tên, số điện thoại, nhu cầu khi khách nói.</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {leadEntries.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{leadFieldLabel(key)}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        <section className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-semibold">Vì sao bot trả lời vậy?</h3>
          <TracePanel trace={selectedTrace} medicalSafety />
        </section>
      </aside>
    </div>
  );
}

function Bubble({ message, selected, onExplain }: { message: InboxMessage; selected: boolean; onExplain: () => void }) {
  const fromCustomer = message.sender === "customer";
  const time = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  if (message.sender === "system") {
    return (
      <li className="mx-auto max-w-[85%] rounded-md border border-dashed bg-card px-3 py-2 text-center text-xs text-pretty whitespace-pre-wrap text-muted-foreground">
        <span className="font-medium">{senderLabels.system}:</span> {message.text}
      </li>
    );
  }

  const Icon = message.sender === "bot" ? Bot : UserRound;
  return (
    <li className={cn("flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]", fromCustomer ? "items-start self-start" : "items-end self-end")}>
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
          fromCustomer && "rounded-bl-sm border bg-card",
          message.sender === "bot" && "rounded-br-sm bg-secondary text-secondary-foreground",
          message.sender === "staff" && "rounded-br-sm bg-primary text-primary-foreground",
          selected && "ring-2 ring-primary/40",
        )}
      >
        {message.text}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
        {!fromCustomer && (
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" aria-hidden />
            {message.proactive ? "Bot chủ động nhắn" : (senderLabels[message.sender] ?? message.sender)}
          </span>
        )}
        <time dateTime={message.createdAt} className="tabular">
          {time}
        </time>
        {message.deliveryStatus === "pending" && <span>Đang gửi…</span>}
        {message.deliveryStatus === "failed" && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <CircleAlert className="size-3" aria-hidden />
            Không gửi được{message.deliveryError ? ` (${message.deliveryError})` : ""}
          </span>
        )}
        {message.trace && (
          <button
            type="button"
            onClick={onExplain}
            aria-pressed={selected}
            className="inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-sm px-1 font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <HelpCircle className="size-3.5" aria-hidden />
            Vì sao?
          </button>
        )}
      </div>
    </li>
  );
}
