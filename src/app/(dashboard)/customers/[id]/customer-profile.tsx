"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { CalendarClock, CircleAlert, LoaderCircle, MessageSquareText, NotebookPen, Sparkles, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ContactDetail, type ContactNote } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import {
  followUpPresets,
  formatDay,
  formatVnTime,
  leadStatuses,
  leadStatusOf,
  noteKindLabel,
  noteKinds,
  outcomeLabel,
  parseTags,
  todayVn,
  triggerLabel,
  vnLocalToIso,
} from "@/lib/customers";
import { formatDateTime } from "@/lib/format";
import { useApiData, useNow } from "@/lib/use-api-data";
import { SuggestionCard } from "../../care/suggestion-card";
import { elapsed } from "../../inbox/inbox-utils";

const autoStatus = "auto";

export function CustomerProfile({ contactId }: { contactId: string }) {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/contacts/{contactId}", { params: { path: { contactId } } })));
  const { data: members } = useApiData(() => call(() => api.GET("/tenant/members")));
  const now = useNow();
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [analyzing, setAnalyzing] = useState<"idle" | "busy" | "queued">("idle");

  useEffect(() => {
    reload();
  }, [me.currentTenant?.id, reload]);

  if (problem && !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Hồ sơ khách" back={{ href: "/customers", label: "Khách hàng" }} />
        <ErrorState problem={problem} onRetry={reload} />
      </div>
    );
  }

  if (loading || !data) {
    return <div role="status" aria-label="Đang tải hồ sơ khách" className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />;
  }

  const c = data.contact;
  const status = leadStatusOf(c.leadStatus);
  const latest = data.conversations[0];
  const openSuggestions = data.suggestions.filter((s) => s.status === "open");
  const pastSuggestions = data.suggestions.filter((s) => s.status !== "open");

  async function patch(body: { leadStatus?: string | null; tags?: string[] | null; proactiveEnabled?: boolean | null }) {
    setActionProblem(null);
    const result = await call(() =>
      api.PATCH("/contacts/{contactId}", { params: { path: { contactId } }, body: { leadStatus: null, tags: null, proactiveEnabled: null, ...body } }),
    );
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  async function analyze() {
    if (!latest) return;
    setAnalyzing("busy");
    setActionProblem(null);
    const result = await call(() => api.POST("/care/conversations/{conversationId}/analyze", { params: { path: { conversationId: latest.id } } }));
    if (!result.ok) {
      setActionProblem(result.problem);
      setAnalyzing("idle");
      return;
    }
    setAnalyzing("queued");
    // AI chạy nền, thường xong trong vài giây.
    setTimeout(reload, 4000);
    setTimeout(reload, 10000);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/customers", label: "Khách hàng" }}
        title={c.name}
        meta={
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
            <Badge variant={status.variant}>{status.label}</Badge>
            {c.isTest && <Badge variant="outline">Chat thử</Badge>}
            {c.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {c.lastCustomerMessageAt && <span>Nhắn lần cuối {elapsed(c.lastCustomerMessageAt, now)} trước</span>}
          </div>
        }
        actions={
          latest && (
            <Button variant="outline" onClick={() => void analyze()} disabled={analyzing === "busy"} className="h-11 sm:h-9">
              {analyzing === "busy" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles aria-hidden />}
              AI chăm sóc khách này
            </Button>
          )
        }
      />

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}
      {analyzing === "queued" && openSuggestions.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          AI đang đọc lại cuộc trò chuyện… Nếu phù hợp, bot sẽ tự nhắn khách hoặc báo bạn liên hệ; khách chưa cần chăm sóc thì không làm gì.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {openSuggestions.map((s) => (
            <SuggestionCard key={`${s.id}-${s.updatedAt}`} suggestion={s} members={members} isOwner={isOwner} now={now} onChanged={reload} showContact={false} />
          ))}

          <section aria-labelledby="journal" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="journal" className="text-base font-semibold">
                Nhật ký chăm sóc
              </h2>
              <p className="text-sm text-muted-foreground">
                Ghi lại khách đã làm gì (dịch vụ đã dùng, lịch hẹn...). Đặt &quot;lúc chăm sóc lại&quot; để tới giờ đó khách tự hiện ở trang Cần chăm sóc kèm tin nháp.
              </p>
            </div>
            <NoteForm contactId={contactId} onAdded={reload} />
            {data.notes.length === 0 ? (
              <EmptyState icon={NotebookPen} title="Chưa có ghi chú" description="Ví dụ: “Đã làm massage 90 phút, hẹn tái khám” + ngày chăm sóc lại." />
            ) : (
              <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
                {data.notes.map((n) => (
                  <NoteItem key={n.id} note={n} canDelete={isOwner || n.authorUserId === me.userId} contactId={contactId} onDeleted={reload} />
                ))}
              </ol>
            )}
          </section>

          {pastSuggestions.length > 0 && (
            <section aria-labelledby="care-history" className="flex flex-col gap-2">
              <h2 id="care-history" className="text-base font-semibold">
                Lịch sử gợi ý chăm sóc
              </h2>
              <ul className="flex flex-col divide-y rounded-lg border">
                {pastSuggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
                    <span className="font-medium">{triggerLabel(s.trigger)}</span>
                    <span className="text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                    <Badge variant={s.status === "done" ? "success" : "secondary"} className="ml-auto">
                      {s.status === "done" ? (outcomeLabel(s.outcome) ?? "Đã xử lý") : s.status === "skipped" ? "Đã bỏ qua" : "Hết hạn nhắn"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 rounded-lg border bg-card p-4">
          <section className="flex flex-col gap-2">
            <Label htmlFor="lead-status">Mức độ tiềm năng</Label>
            <Select value={c.leadStatusManual ? c.leadStatus : autoStatus} onValueChange={(v) => void patch({ leadStatus: v })}>
              <SelectTrigger id="lead-status" className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={autoStatus}>Tự động — hiện là &quot;{status.label}&quot;</SelectItem>
                {leadStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {c.leadStatusManual ? "Bạn đã đặt tay, hệ thống không tự đổi nữa." : "Hệ thống tự nâng khi khách để lại số điện thoại, hỏi lịch hoặc AI đánh giá nóng."}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="proactive" className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <Checkbox
                id="proactive"
                checked={!c.proactiveOptOut}
                disabled={c.proactiveOptOut === "customer"}
                onCheckedChange={(v) => void patch({ proactiveEnabled: v === true })}
              />
              Bot được chủ động nhắn khách này
            </Label>
            <p className="text-xs text-muted-foreground">
              {c.proactiveOptOut === "customer"
                ? "Khách đã nhắn từ chối nhận tin. Bot chỉ trả lời khi khách tự nhắn tới; không bật lại được."
                : c.lastProactiveAt
                  ? `Lần cuối bot chủ động nhắn: ${formatVnTime(c.lastProactiveAt)}.`
                  : "Bot hỏi thăm khi khách im lặng hoặc tới giờ hẹn chăm sóc trong nhật ký."}
            </p>
          </section>

          <TagEditor tags={c.tags} onChange={(tags) => void patch({ tags })} />

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Thông tin khách</h2>
            {data.leadFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Khách chưa để lại thông tin. Bot tự ghi tên, số điện thoại, nhu cầu khi khách nói.</p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                {data.leadFields.map((f) => (
                  <div key={f.key} className="contents">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <Conversations detail={data} now={now} />
        </aside>
      </div>
    </div>
  );
}

function Conversations({ detail, now }: { detail: ContactDetail; now: number }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Hội thoại</h2>
      <ul className="flex flex-col gap-1.5">
        {detail.conversations.map((c) => (
          <li key={c.id}>
            <Link
              href={`/inbox?c=${c.id}`}
              className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <MessageSquareText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">{c.mode === "human" ? "Nhân viên đang xử lý" : "Bot đang trả lời"}</span>
              <span className="tabular text-xs text-muted-foreground">{elapsed(c.lastMessageAt ?? c.createdAt, now)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const next = parseTags(input, tags);
    setInput("");
    if (next.length !== tags.length) onChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && !event.nativeEvent.isComposing) {
      event.preventDefault();
      add();
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <Label htmlFor="tag-input">Nhãn</Label>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t}>
              <Badge variant="secondary" className="gap-1 pr-0.5">
                {t}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((x) => x !== t))}
                  aria-label={`Bỏ nhãn ${t}`}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input id="tag-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="VIP, khách cũ…" maxLength={60} className="h-11 sm:h-9" />
        <Button variant="outline" onClick={add} disabled={!input.trim()} className="h-11 sm:h-9">
          Thêm
        </Button>
      </div>
    </section>
  );
}

function NoteForm({ contactId, onAdded }: { contactId: string; onAdded: () => void }) {
  const [kind, setKind] = useState<"note" | "service" | "appointment">("service");
  const [text, setText] = useState("");
  const [happenedOn, setHappenedOn] = useState(() => todayVn());
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/contacts/{contactId}/notes", {
        params: { path: { contactId } },
        body: { kind, text: text.trim(), happenedOn, followUpAt: vnLocalToIso(followUpAt) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setText("");
    setFollowUpAt("");
    onAdded();
  }

  const error = (field: string) => problem?.fieldErrors[field];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="note-kind">Loại</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <SelectTrigger id="note-kind" className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noteKinds.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="note-date">Ngày</Label>
          <Input id="note-date" type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} className="h-11 sm:h-9" aria-invalid={Boolean(error("happenedOn"))} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note-text">Nội dung</Label>
        <Textarea
          id="note-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ví dụ: Đã làm massage cổ vai gáy 90 phút, khách muốn quay lại sau 1 tuần."
          aria-invalid={Boolean(error("text"))}
        />
        {error("text") && <p className="text-sm text-destructive">{error("text")}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note-follow">Lúc chăm sóc lại (không bắt buộc)</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="note-follow"
            type="datetime-local"
            value={followUpAt}
            min={`${happenedOn}T00:00`}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="h-11 sm:h-9 sm:max-w-56"
            aria-invalid={Boolean(error("followUpAt"))}
            aria-describedby="note-follow-hint"
          />
          <div role="group" aria-label="Chọn nhanh" className="flex flex-wrap gap-1.5">
            {followUpPresets(0).map((p, i) => (
              <Button key={p.label} type="button" size="sm" variant="outline" className="h-11 sm:h-8" onClick={() => setFollowUpAt(followUpPresets(Date.now())[i].value)}>
                {p.label}
              </Button>
            ))}
            {followUpAt && (
              <Button type="button" size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setFollowUpAt("")}>
                Bỏ hẹn
              </Button>
            )}
          </div>
        </div>
        {error("followUpAt") ? (
          <p className="text-sm text-destructive">{error("followUpAt")}</p>
        ) : (
          <p id="note-follow-hint" className="text-xs text-muted-foreground">
            Giờ Việt Nam. Tới giờ này (trễ tối đa khoảng 1 phút), AI soạn sẵn tin hỏi thăm ở trang Cần chăm sóc.
          </p>
        )}
      </div>
      {problem && Object.keys(problem.fieldErrors).length === 0 && (
        <p role="alert" className="text-sm text-destructive">
          {problemMessage(problem)}
        </p>
      )}
      <Button type="submit" disabled={saving || !text.trim()} className="h-11 self-start sm:h-9">
        {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
        {saving ? "Đang lưu..." : "Lưu ghi chú"}
      </Button>
    </form>
  );
}

function NoteItem({ note, canDelete, contactId, onDeleted }: { note: ContactNote; canDelete: boolean; contactId: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Xóa ghi chú này?")) return;
    setBusy(true);
    await call(() => api.DELETE("/contacts/{contactId}/notes/{noteId}", { params: { path: { contactId, noteId: note.id } } }));
    setBusy(false);
    onDeleted();
  }

  return (
    <li className="relative flex flex-col gap-1.5 rounded-lg border bg-card p-3">
      <span className="absolute top-4 -left-[1.4rem] size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={note.kind === "service" ? "success" : note.kind === "appointment" ? "info" : "secondary"}>{noteKindLabel(note.kind)}</Badge>
        <span className="font-medium">{formatDay(note.happenedOn)}</span>
        {note.followUpAt && (
          <span className="inline-flex items-center gap-1 text-warning">
            <CalendarClock className="size-3.5" aria-hidden />
            Chăm sóc lại lúc {formatVnTime(note.followUpAt)}
          </span>
        )}
        {canDelete && (
          <Button variant="ghost" size="icon-sm" className="ml-auto size-9" onClick={() => void remove()} disabled={busy} aria-label="Xóa ghi chú">
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      <p className="text-sm text-pretty whitespace-pre-wrap">{note.text}</p>
      <p className="text-xs text-muted-foreground">{note.authorName ? `${note.authorName} · ` : ""}{formatDateTime(note.createdAt)}</p>
    </li>
  );
}
