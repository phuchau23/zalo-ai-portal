"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CircleAlert,
  Hand,
  IdCard,
  Info,
  LoaderCircle,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  SendHorizontal,
  Siren,
  UserRoundCheck,
} from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { LeadStatusBadge } from "@/components/common/lead-status-badge";
import { PersonAvatar } from "@/components/common/person-avatar";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type InboxItem } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { useApiData } from "@/lib/use-api-data";
import { useMediaQuery } from "@/lib/use-media-query";
import { leadStatusOf } from "@/lib/customers";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { handoffReasonLabel, leadFieldLabel } from "../chat-test/labels";
import { TracePanel } from "../chat-test/trace-panel";
import { ModeBadge } from "./conversation-list";
import { elapsed, priorityOf } from "./inbox-utils";
import { MessageThread } from "./message-thread";

const maxLength = 1900;
const unassigned = "__none__";

type Member = { userId: string; name: string };

/**
 * Khung hội thoại (giữa) + tấm thông tin khách (phải, màn rộng ≥ 1280px; màn hẹp mở bằng hộp thoại).
 * Thanh trên: khách, ai đang trả lời, nút chính (Tiếp quản / Trả lại cho bot), menu thêm (hồ sơ, giao nhân viên).
 * Ô soạn tin kiểu ứng dụng chat: Enter gửi, Shift+Enter xuống dòng; gửi khi bot đang trả lời sẽ tự tiếp quản.
 */
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
  const [panelOpen, setPanelOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");

  // Sự kiện realtime (tin mới, đổi trạng thái) → tải lại.
  useEffect(() => {
    if (version > 0) reload();
  }, [version, reload]);

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

  function explain(messageId: string) {
    setTraceId(messageId);
    if (wide) setPanelOpen(true);
    else setDetailsOpen(true);
  }

  if (problem && !data) {
    return (
      <div className="p-4">
        <ErrorState problem={problem} onRetry={reload} />
      </div>
    );
  }

  if (loading && !data) return <ConversationSkeleton />;
  if (!data) return null;

  const c = data.conversation;
  const human = c.mode === "human";
  const priority = priorityOf(c);
  const urgent = priority === "urgent";
  const assignee = members?.find((m) => m.userId === c.assignedUserId);
  const selectedTrace = data.messages.find((m) => m.id === traceId)?.trace ?? null;
  const lead = leadStatusOf(c.leadStatus);
  const staffNames = Object.fromEntries((members ?? []).map((m) => [m.userId, m.name]));
  const details = (
    <CustomerDetails
      conversation={c}
      leadFields={data.leadFields}
      members={isOwner ? members : undefined}
      busy={busy}
      onAssign={(id) => void assign(id)}
      trace={selectedTrace}
    />
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-2 sm:px-5">
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onBack} aria-label="Quay lại danh sách">
            <ArrowLeft />
          </Button>
          <PersonAvatar name={c.contactName} size="md" badge={<ModeBadge priority={priority} mode={c.mode} size="md" />} />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-[15px] leading-tight font-semibold">{c.contactName}</h2>
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <StatusDot tone={urgent ? "destructive" : human ? "warning" : "ai"} pulse={!human || urgent} />
              <span className="truncate">
                {human ? (assignee ? `${assignee.name} đang xử lý` : "Nhân viên đang xử lý") : "Bot đang trả lời"}
                <span aria-hidden> · </span>
                {lead.label}
                {c.isTest && " · Chat thử"}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {human ? (
              <Button size="sm" variant="outline" onClick={() => void returnToBot()} disabled={busy}>
                <RotateCcw aria-hidden />
                <span className="sr-only sm:not-sr-only">Trả lại cho bot</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => void takeOver()} disabled={busy}>
                <Hand aria-hidden />
                <span className="sr-only sm:not-sr-only">Tiếp quản</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Thêm thao tác">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
                  <Link href={`/customers/${c.contactId}`}>
                    <IdCard aria-hidden />
                    Mở hồ sơ khách
                  </Link>
                </DropdownMenuItem>
                {!wide && (
                  <DropdownMenuItem className="min-h-10 cursor-pointer" onSelect={() => setDetailsOpen(true)}>
                    <Info aria-hidden />
                    Thông tin khách & lý do bot
                  </DropdownMenuItem>
                )}
                {isOwner && members && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="min-h-10 cursor-pointer">
                        <UserRoundCheck aria-hidden />
                        Giao cho nhân viên
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        <DropdownMenuRadioGroup value={c.assignedUserId ?? unassigned} onValueChange={(v) => void assign(v)}>
                          <DropdownMenuRadioItem value={unassigned} className="min-h-9 cursor-pointer">
                            Chưa giao
                          </DropdownMenuRadioItem>
                          {members.map((m) => (
                            <DropdownMenuRadioItem key={m.userId} value={m.userId} className="min-h-9 cursor-pointer">
                              {m.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {wide && (
              <Button
                variant="ghost"
                size="icon"
                aria-pressed={panelOpen}
                aria-label={panelOpen ? "Ẩn thông tin khách" : "Hiện thông tin khách"}
                title={panelOpen ? "Ẩn thông tin khách" : "Hiện thông tin khách"}
                onClick={() => setPanelOpen((v) => !v)}
              >
                {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
              </Button>
            )}
          </div>
        </header>

        {c.needsAttentionSince && (
          <div role="status" className={cn("flex shrink-0 items-center gap-3 border-b px-4 py-2.5 sm:px-5", urgent ? "bg-destructive/[0.06]" : "bg-warning/[0.08]")}>
            <IconTile icon={urgent ? Siren : Hand} tone={urgent ? "destructive" : "warning"} variant="solid" size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className={cn("text-sm font-semibold", urgent ? "text-destructive" : "text-warning")}>
                {urgent ? "Khách có dấu hiệu nguy hiểm — cần liên hệ ngay" : "Khách đang chờ nhân viên"} · chờ {elapsed(c.needsAttentionSince, now)}
              </p>
              <p className="text-xs text-pretty text-muted-foreground">
                {c.handoffReason ? `Lý do: ${handoffReasonLabel(c.handoffReason)}. ` : ""}
                {human ? "Bot đã dừng, hãy trả lời khách." : ""}
              </p>
            </div>
            {!human && (
              <Button size="sm" onClick={() => void takeOver()} disabled={busy}>
                Tiếp quản ngay
              </Button>
            )}
          </div>
        )}

        <MessageThread
          messages={data.messages}
          contactName={c.contactName}
          staffNames={staffNames}
          now={now}
          selectedTraceId={traceId}
          onExplain={explain}
        />

        {actionProblem && (
          <div role="alert" className="flex shrink-0 items-center gap-2 border-t bg-destructive/5 px-4 py-2 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {problemMessage(actionProblem)}
          </div>
        )}

        <form onSubmit={onSubmit} className="shrink-0 border-t bg-card px-3 pt-3 pb-3 sm:px-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
            <div className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 pl-4 shadow-card transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-ring/25">
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
                placeholder={`Nhắn cho ${c.contactName}...`}
                className="max-h-40 min-h-10 flex-1 resize-none rounded-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={busy || !draft.trim()} aria-label="Gửi tin">
                {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <SendHorizontal aria-hidden />}
              </Button>
            </div>
            <div className="flex items-start justify-between gap-3 px-1 text-[11px] text-muted-foreground">
              <span className="text-pretty">
                {human ? "Enter để gửi · Shift+Enter xuống dòng" : "Gửi tin sẽ tự tiếp quản: bot dừng trả lời hội thoại này cho tới khi bạn trả lại."}
              </span>
              {draft.length > maxLength * 0.8 && (
                <span className={cn("tabular shrink-0", draft.length >= maxLength && "font-medium text-destructive")}>
                  {draft.length}/{maxLength}
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      {wide && panelOpen && (
        <motion.aside
          aria-label="Thông tin khách"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: easeOut }}
          className="scrollbar-thin flex w-[21rem] shrink-0 flex-col overflow-y-auto border-l bg-card"
        >
          {details}
        </motion.aside>
      )}

      <Dialog open={detailsOpen && !wide} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[88dvh] gap-0 overflow-y-auto p-0 sm:max-w-md">
          <DialogTitle className="sr-only">Thông tin khách {c.contactName}</DialogTitle>
          <DialogDescription className="sr-only">Thông tin bot đã ghi lại và lý do bot trả lời.</DialogDescription>
          {details}
        </DialogContent>
      </Dialog>
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

/** Tấm thông tin khách: ảnh + trạng thái, thông tin bot đã ghi, người phụ trách, giải thích câu trả lời của bot. */
function CustomerDetails({
  conversation: c,
  leadFields,
  members,
  busy,
  onAssign,
  trace,
}: {
  conversation: InboxItem;
  leadFields: Record<string, string>;
  members: Member[] | undefined;
  busy: boolean;
  onAssign: (userId: string) => void;
  trace: Parameters<typeof TracePanel>[0]["trace"];
}) {
  const entries = Object.entries(leadFields);
  return (
    <>
      <div className="relative flex flex-col items-center gap-3 overflow-hidden px-5 pt-8 pb-5 text-center">
        <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-brand-gradient opacity-[0.12]" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-dot-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <PersonAvatar name={c.contactName} size="xl" className="relative" />
        <div className="relative flex flex-col gap-0.5">
          <p className="text-base font-semibold">{c.contactName}</p>
          <p className="text-xs text-muted-foreground">{c.isTest ? "Khách chat thử" : c.channel === "zalo" ? "Khách nhắn qua Zalo OA" : "Khách nhắn qua web"}</p>
        </div>
        <div className="relative flex flex-wrap justify-center gap-1.5">
          <LeadStatusBadge status={c.leadStatus} />
          {c.mode === "human" ? <Badge variant="warning">Nhân viên xử lý</Badge> : <Badge className="border-ai/20 bg-ai-soft text-ai">Bot đang trả lời</Badge>}
        </div>
        <Link href={`/customers/${c.contactId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "relative mt-1 rounded-full")}>
          <IdCard aria-hidden />
          Mở hồ sơ khách
        </Link>
      </div>

      <section className="flex flex-col gap-2.5 border-t px-5 py-4">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Bot đã ghi lại</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-pretty text-muted-foreground">Khách chưa để lại thông tin. Bot sẽ tự ghi tên, số điện thoại, nhu cầu khi khách nói.</p>
        ) : (
          <dl className="flex flex-col gap-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-0.5 rounded-xl bg-muted/50 px-3 py-2">
                <dt className="text-[11px] font-medium text-muted-foreground">{leadFieldLabel(key)}</dt>
                <dd className="text-sm break-words">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {members && (
        <section className="flex flex-col gap-2.5 border-t px-5 py-4">
          <h3 id="assign-label" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Người phụ trách
          </h3>
          <Select value={c.assignedUserId ?? unassigned} onValueChange={onAssign} disabled={busy}>
            <SelectTrigger className="w-full" aria-labelledby="assign-label">
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
        </section>
      )}

      <section className="flex flex-col gap-3 border-t px-5 py-4">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vì sao bot trả lời vậy?</h3>
        <TracePanel trace={trace} medicalSafety />
      </section>
    </>
  );
}

function ConversationSkeleton() {
  return (
    <div role="status" aria-label="Đang tải hội thoại" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="skeleton size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-2.5 w-48 opacity-70" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 bg-canvas p-6">
        {[60, 40, 70, 35, 55].map((w, i) => (
          <div key={i} className={cn("skeleton h-10 rounded-2xl", i % 2 ? "self-end" : "self-start")} style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
