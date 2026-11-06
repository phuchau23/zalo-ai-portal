"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CircleAlert,
  Clock,
  Flame,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  SendHorizontal,
  Snowflake,
  Sparkles,
  Target,
  Thermometer,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type CareSuggestion, type TenantMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { careStatusLabels, escalationLabel, formatVnTime, messagingWindow, outcomeLabel, outcomes, temperatures, triggerLabel } from "@/lib/customers";
import { cn } from "@/lib/utils";
import { elapsed } from "../inbox/inbox-utils";

const unassigned = "__none__";
const maxLength = 1900;

const temperatureIcons = { hot: Flame, warm: Thermometer, cold: Snowflake } as const;

/** Một gợi ý "Cần chăm sóc": lý do, tin nháp, hạn nhắn, giao việc, nhắn ngay (nhân viên sửa rồi mới gửi). */
export function SuggestionCard({
  suggestion: s,
  members,
  isOwner,
  now,
  onChanged,
  showContact = true,
}: {
  suggestion: CareSuggestion;
  members: TenantMember[] | undefined;
  isOwner: boolean;
  now: number;
  onChanged: () => void;
  showContact?: boolean;
}) {
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState(s.draft ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [sent, setSent] = useState(false);

  const temp = temperatures[s.temperature] ?? temperatures.warm;
  const TempIcon = temperatureIcons[s.temperature as keyof typeof temperatureIcons] ?? Thermometer;
  const win = messagingWindow(s, now);
  const open = s.status === "open";
  const assignee = members?.find((m) => m.userId === s.assignedUserId)?.name ?? s.assignedName;
  const textId = `care-draft-${s.id}`;

  async function run(request: () => Promise<{ ok: boolean; problem?: ApiProblem }>) {
    setBusy(true);
    setProblem(null);
    const result = await request();
    setBusy(false);
    if (!result.ok) {
      if (result.problem) setProblem(result.problem);
      return false;
    }
    return true;
  }

  const path = { params: { path: { suggestionId: s.id } } };
  const resolve = async (status: "done" | "skipped" | "open", outcome: string | null = null) => {
    if (await run(() => call(() => api.PATCH("/care/suggestions/{suggestionId}", { ...path, body: { status, outcome } })))) onChanged();
  };
  const assign = async (userId: string) => {
    if (await run(() => call(() => api.POST("/care/suggestions/{suggestionId}/assign", { ...path, body: { userId: userId === unassigned ? null : userId } }))))
      onChanged();
  };

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    const ok = await run(() =>
      call(() => api.POST("/inbox/conversations/{conversationId}/messages", { params: { path: { conversationId: s.conversationId } }, body: { text: body } })),
    );
    if (!ok) return;
    setSent(true);
    setComposing(false);
    await resolve("done");
  }

  const hot = s.temperature === "hot";
  const accent = hot ? "bg-destructive" : s.temperature === "warm" ? "bg-warning" : "bg-info";

  return (
    <article
      aria-labelledby={`care-${s.id}`}
      className={cn("lift relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card", open && hot && "border-destructive/30", !open && "opacity-90")}
    >
      {/* Vạch màu bên trái theo độ nóng của khách. */}
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", open ? accent : "bg-border")} />

      <div className="flex flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
          {showContact ? (
            <PersonAvatar
              name={s.contactName}
              size="md"
              badge={
                <span className={cn("flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-card", accent)}>
                  <TempIcon className="size-2.5" />
                </span>
              }
            />
          ) : (
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                hot ? "bg-destructive/10 text-destructive" : s.temperature === "warm" ? "bg-warning/10 text-warning" : "bg-info/10 text-info",
              )}
              aria-hidden
            >
              <TempIcon className="size-5" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 id={`care-${s.id}`} className="flex flex-wrap items-center gap-2 font-semibold">
              {showContact ? (
                <Link
                  href={`/customers/${s.contactId}`}
                  className="rounded-sm transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {s.contactName}
                </Link>
              ) : (
                triggerLabel(s.trigger)
              )}
              <Badge variant={temp.variant}>
                <TempIcon aria-hidden />
                {temp.label}
              </Badge>
              {showContact && <Badge variant="outline">{triggerLabel(s.trigger)}</Badge>}
              {s.isTest && <span className="rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground uppercase">Chat thử</span>}
            </h3>
            <p className="text-xs text-muted-foreground">
              {s.lastCustomerMessageAt ? `Khách im lặng ${elapsed(s.lastCustomerMessageAt, now)}` : "Chưa có tin của khách"}
              {" · "}gợi ý lúc {new Date(s.updatedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
            </p>
          </div>
          {!open && (
            <Badge variant={s.status === "done" || s.status === "autosent" ? "success" : "secondary"}>
              {s.status === "done" ? (outcomeLabel(s.outcome) ?? "Đã xử lý") : (careStatusLabels[s.status] ?? s.status)}
            </Badge>
          )}
        </header>

        {open && s.scheduledSendAt && (
          <p role="status" className="flex items-start gap-2.5 rounded-xl border border-ai/20 bg-ai-soft px-3.5 py-2.5 text-sm">
            <Bot className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
            <span>
              Bot sẽ tự nhắn khách lúc <strong>{formatVnTime(s.scheduledSendAt)}</strong>. Muốn tự nhắn thay thì bấm &quot;Nhắn ngay&quot;; không muốn gửi thì &quot;Bỏ qua&quot;.
            </span>
          </p>
        )}
        {open && s.escalationReason && (
          <p role="status" className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5 text-sm">
            <UserRound className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              <strong>Cần nhân viên liên hệ:</strong> {escalationLabel(s.escalationReason)}
            </span>
          </p>
        )}
        {s.status === "autosent" && (
          <p className="flex items-start gap-2.5 rounded-xl bg-success/[0.07] px-3.5 py-2.5 text-sm text-success">
            <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
            Bot đã tự nhắn khách lúc {formatVnTime(s.updatedAt)}. Khách trả lời thì bot nói chuyện tiếp; cần người thì sẽ báo bạn.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl bg-muted/50 px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <Lightbulb className="size-3.5" aria-hidden />
              Lý do
            </span>
            <p className="text-sm text-pretty">{s.reason}</p>
          </div>
          {s.suggestedAction && (
            <div className="flex flex-col gap-1 rounded-xl bg-primary/[0.05] px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-primary uppercase">
                <Target className="size-3.5" aria-hidden />
                Nên làm
              </span>
              <p className="text-sm text-pretty">{s.suggestedAction}</p>
            </div>
          )}
        </div>

        {s.draft && !composing && (
          <figure className="flex flex-col items-end gap-1">
            <figcaption className="flex items-center gap-1 px-1 text-[11px] font-semibold text-ai">
              <Sparkles className="size-3" aria-hidden />
              {s.status === "autosent" ? "Tin bot đã gửi" : s.scheduledSendAt ? "Tin bot sẽ gửi" : "Tin nháp AI viết sẵn"}
            </figcaption>
            <blockquote className="max-w-[92%] rounded-2xl rounded-br-md border border-ai/15 bg-ai-soft px-3.5 py-2.5 text-sm leading-relaxed text-pretty whitespace-pre-wrap sm:max-w-[80%]">
              {s.draft}
            </blockquote>
          </figure>
        )}

        {open && (
          <p
            className={cn(
              "flex w-fit items-start gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              win.tone === "closed" ? "bg-destructive/10 text-destructive" : win.tone === "soon" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
            )}
          >
            <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
            {win.text}
          </p>
        )}

      {composing && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={textId}>Tin gửi khách (sửa trước khi gửi)</Label>
          <Textarea id={textId} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={maxLength} autoFocus className="rounded-xl" />
          <p className="text-xs text-muted-foreground">
            Gửi xong, hội thoại chuyển sang nhân viên (bot tạm dừng). Vào Hộp thư bấm &quot;Trả lại cho bot&quot; nếu muốn bot trả lời tiếp.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void send()} disabled={busy || !text.trim()} className="h-11 sm:h-9">
              {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <SendHorizontal aria-hidden />}
              Gửi cho khách
            </Button>
            <Button variant="ghost" onClick={() => setComposing(false)} disabled={busy} className="h-11 sm:h-9">
              Hủy
            </Button>
          </div>
        </div>
      )}

      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      {sent && <p role="status" className="text-sm text-success">Đã gửi tin cho khách.</p>}
      </div>

      <footer className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3 pl-5 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:pl-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground sm:mr-auto">
          <span className="shrink-0">Giao cho:</span>
          {isOwner && members && open ? (
            <Select value={s.assignedUserId ?? unassigned} onValueChange={(v) => void assign(v)} disabled={busy}>
              <SelectTrigger size="sm" className="h-11 w-full sm:h-8 sm:w-40" aria-label={`Giao khách ${s.contactName} cho nhân viên`}>
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
          ) : (
            <span className="text-foreground">{assignee || "Chưa giao"}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href={`/inbox?c=${s.conversationId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 sm:h-8")}>
            <MessageSquareText aria-hidden />
            Mở hội thoại
          </Link>
          {open && !composing && (
            <Button size="sm" className="h-11 sm:h-8" onClick={() => setComposing(true)} disabled={!win.canMessage || busy} title={win.canMessage ? undefined : win.text}>
              <SendHorizontal aria-hidden />
              Nhắn ngay
            </Button>
          )}
          {open && (
            <Select onValueChange={(v) => void resolve("done", v)} disabled={busy}>
              <SelectTrigger size="sm" className="h-11 w-full sm:h-8 sm:w-40" aria-label="Đánh dấu đã xử lý và ghi kết quả">
                <SelectValue placeholder="Đã xử lý…" />
              </SelectTrigger>
              <SelectContent>
                {outcomes.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {open && (
            <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => void resolve("skipped")} disabled={busy}>
              <X aria-hidden />
              Bỏ qua
            </Button>
          )}
          {(s.status === "done" || s.status === "autosent") && (
            <Select value={s.outcome && s.outcome !== "customer_replied" ? s.outcome : undefined} onValueChange={(v) => void resolve("done", v)} disabled={busy}>
              <SelectTrigger size="sm" className="h-11 w-full sm:h-8 sm:w-40" aria-label="Ghi kết quả chăm sóc">
                <SelectValue placeholder="Ghi kết quả…" />
              </SelectTrigger>
              <SelectContent>
                {outcomes.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {s.status === "skipped" && (
            <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => void resolve("open")} disabled={busy}>
              <Undo2 aria-hidden />
              Mở lại
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
