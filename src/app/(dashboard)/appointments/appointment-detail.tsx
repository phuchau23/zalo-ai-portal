"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, CalendarClock, CircleAlert, CircleCheck, CircleDashed, ExternalLink, LoaderCircle, Receipt, Sparkles, UserRound } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { LeadStatusBadge } from "@/components/common/lead-status-badge";
import { PersonAvatar } from "@/components/common/person-avatar";
import { ErrorState } from "@/components/common/states";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type Appointment, type AppointmentEvent, type StaffMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import {
  actorLabel,
  canCancel,
  canReschedule,
  eventKindLabel,
  formatDateTimeTz,
  formatDayLong,
  formatTimeRange,
  isBriefPending,
  isTerminal,
  nextStatuses,
  sourceLabel,
  statusLabel,
  toLocalInput,
  type AppointmentStatus,
} from "@/lib/appointments";
import { formatMoney } from "@/lib/format";
import { useApiData, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { InvoiceDetailDialog } from "../sales/invoice-detail";

const NONE = "__none__";

const actionLabels: Record<AppointmentStatus, string> = {
  booked: "Đã đặt",
  confirmed: "Xác nhận",
  arrived: "Đã đến",
  in_progress: "Bắt đầu làm",
  done: "Hoàn thành",
  no_show: "Không đến",
  cancelled: "Hủy",
};

/** Chi tiết một lịch hẹn: thông tin, tóm tắt AI, thao tác theo trạng thái, ghi chú, lịch sử. */
export function AppointmentDetailDialog({
  appointmentId,
  timeZone,
  staff,
  onClose,
  onChanged,
  onReschedule,
}: {
  appointmentId: string;
  timeZone: string;
  staff: StaffMember[];
  onClose: () => void;
  onChanged: () => void;
  onReschedule: (appointment: Appointment) => void;
}) {
  const { data, problem, reload } = useApiData(() =>
    call(() => api.GET("/appointments/{appointmentId}", { params: { path: { appointmentId } } })),
  );
  const now = useNow();
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const a = data?.appointment;
  const createdAt = data?.events.find((e) => e.kind === "created")?.at ?? null;
  const briefPending = a ? isBriefPending(a, createdAt, now) : false;

  // AI đang viết tóm tắt → tải lại sau vài giây.
  useEffect(() => {
    if (!briefPending) return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [briefPending, reload, data]);

  async function act(request: () => Promise<ApiResult<unknown>>): Promise<boolean> {
    setActionProblem(null);
    setBusy(true);
    const result = await request();
    setBusy(false);
    if (!result.ok) setActionProblem(result.problem);
    reload();
    onChanged();
    return result.ok;
  }

  const setStatus = (status: AppointmentStatus) =>
    act(() => call(() => api.PATCH("/appointments/{appointmentId}/status", { params: { path: { appointmentId } }, body: { status } })));

  const assign = (staffMemberId: string | null) =>
    act(() =>
      call(() =>
        api.PATCH("/appointments/{appointmentId}/assign", { params: { path: { appointmentId } }, body: { staffMemberId, resourceId: a?.resourceId ?? null } }),
      ),
    );

  async function cancel() {
    const ok = await act(() =>
      call(() => api.POST("/appointments/{appointmentId}/cancel", { params: { path: { appointmentId } }, body: { reason: cancelReason.trim() || null } })),
    );
    if (ok) setCancelOpen(false);
  }

  // Tạo hóa đơn từ lịch (hoặc mở hóa đơn đã có): dịch vụ thuộc gói còn hiệu lực thành dòng "dùng buổi gói".
  async function pay() {
    setActionProblem(null);
    setBusy(true);
    const result = await call(() => api.POST("/invoices/from-appointment/{appointmentId}", { params: { path: { appointmentId } } }));
    setBusy(false);
    if (!result.ok) return setActionProblem(result.problem);
    setInvoiceId(result.data.id);
  }

  const branchStaff = a ? staff.filter((s) => s.branchId === a.branchId && s.status === "active") : [];
  const status = a ? statusLabel(a.status) : null;
  const total = a?.items.reduce((sum, i) => sum + (i.price ?? 0), 0) ?? 0;
  const hasAllPrices = a ? a.items.every((i) => i.price !== null) : false;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {problem && !data ? (
          <>
            <DialogHeader>
              <DialogTitle>Lịch hẹn</DialogTitle>
              <DialogDescription>Không tải được chi tiết.</DialogDescription>
            </DialogHeader>
            <ErrorState problem={problem} onRetry={reload} />
          </>
        ) : !a || !status ? (
          <>
            <DialogHeader>
              <DialogTitle>Lịch hẹn</DialogTitle>
              <DialogDescription>Đang tải chi tiết...</DialogDescription>
            </DialogHeader>
            <div role="status" aria-label="Đang tải lịch hẹn" className="skeleton h-64 rounded-2xl" />
          </>
        ) : (
          <div className="flex flex-col gap-5">
            <DialogHeader className="flex-row items-center gap-3.5 text-left">
              <PersonAvatar name={a.contactName} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <span className={cn(isTerminal(a.status) && a.status !== "done" && "text-muted-foreground line-through")}>{a.contactName}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {a.source === "bot" && (
                    <Badge className="gap-1 border-ai/20 bg-ai-soft text-ai">
                      <Bot aria-hidden />
                      Bot đặt
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {formatDayLong(toLocalInput(a.startAt, timeZone).slice(0, 10))}
                    <span className="tabular">· {formatTimeRange(a.startAt, a.endAt, timeZone)}</span>
                  </span>
                  {a.bufferMinutes > 0 && <span className="text-xs">+{a.bufferMinutes} phút dọn</span>}
                  <span className="text-xs">· {a.branchName}</span>
                </DialogDescription>
              </div>
            </DialogHeader>

            {actionProblem && (
              <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                {problemMessage(actionProblem)}
              </p>
            )}

            {a.cancelReason && (
              <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm">
                <span className="font-medium">Lý do hủy:</span> {a.cancelReason}
              </p>
            )}

            {(!isTerminal(a.status) || a.status === "done") && (
              <div className="flex flex-wrap gap-2 rounded-2xl border bg-muted/40 p-2" role="group" aria-label="Thao tác">
                <Button size="sm" variant={a.status === "done" ? "default" : "outline"} className="h-11 sm:h-9" disabled={busy} onClick={() => void pay()}>
                  <Receipt aria-hidden />
                  {a.status === "done" ? "Thanh toán / hóa đơn" : "Thanh toán"}
                </Button>
                {nextStatuses(a.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "no_show" ? "outline" : "default"}
                    className={cn("h-11 sm:h-9", s === "no_show" && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                    disabled={busy}
                    onClick={() => void setStatus(s)}
                  >
                    {s === "done" && <CircleCheck aria-hidden />}
                    {actionLabels[s]}
                  </Button>
                ))}
                {a.status === "booked" && (
                  <Button size="sm" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void setStatus("confirmed")}>
                    Xác nhận
                  </Button>
                )}
                {canReschedule(a.status) && (
                  <Button size="sm" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => onReschedule(a)}>
                    Dời lịch
                  </Button>
                )}
                {canCancel(a.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
                    disabled={busy}
                    onClick={() => {
                      setCancelReason("");
                      setCancelOpen(true);
                    }}
                  >
                    Hủy lịch
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Dịch vụ</h3>
                <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card text-sm shadow-card">
                  {a.items.map((i) => (
                    <li key={i.catalogItemId} className="flex items-center gap-2 px-3 py-2.5">
                      <span className="min-w-0 flex-1 font-medium">{i.name}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{i.durationMinutes} phút</span>
                      <span className="shrink-0 tabular font-medium">{formatMoney(i.price)}</span>
                    </li>
                  ))}
                  {a.items.length > 1 && hasAllPrices && (
                    <li className="flex items-center justify-between bg-muted/40 px-3 py-2.5 font-semibold">
                      <span>Tạm tính</span>
                      <span className="tabular">{formatMoney(total)}</span>
                    </li>
                  )}
                </ul>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Số người</dt>
                  <dd>{a.partySize}</dd>
                  <dt className="text-muted-foreground">Nguồn</dt>
                  <dd>{sourceLabel(a.source)}</dd>
                  {a.seriesId && (
                    <>
                      <dt className="text-muted-foreground">Chuỗi</dt>
                      <dd>Thuộc liệu trình nhiều buổi</dd>
                    </>
                  )}
                  {a.conversationId && (
                    <>
                      <dt className="text-muted-foreground">Hội thoại</dt>
                      <dd>
                        <Link href={`/inbox?c=${a.conversationId}`} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                          Mở trong Hộp thư <ExternalLink className="size-3" aria-hidden />
                        </Link>
                      </dd>
                    </>
                  )}
                </dl>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Khách</h3>
                <Link
                  href={`/customers/${a.contactId}`}
                  className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-card lift focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <UserRound className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {a.contactSalutation ? `${a.contactSalutation} ` : ""}
                      {a.contactName}
                    </span>
                    {a.contactPhone && <span className="text-muted-foreground"> · {a.contactPhone}</span>}
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Tiềm năng</dt>
                  <dd>
                    {data.contactLeadStatus ? <LeadStatusBadge status={data.contactLeadStatus} size="sm" /> : "—"}
                  </dd>
                  <dt className="text-muted-foreground">Đã đến</dt>
                  <dd>
                    {data.contactVisits} lần
                    {data.contactNoShows > 0 && <span className="text-destructive"> · không đến {data.contactNoShows} lần</span>}
                  </dd>
                </dl>
                <div className="flex flex-col gap-2 pt-1">
                  <Label htmlFor="apt-assign">Nhân viên phụ trách</Label>
                  <Select value={a.staffMemberId ?? NONE} onValueChange={(v) => void assign(v === NONE ? null : v)} disabled={busy || isTerminal(a.status)}>
                    <SelectTrigger id="apt-assign" className="h-11 w-full sm:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Chưa xếp</SelectItem>
                      {branchStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.displayName}
                        </SelectItem>
                      ))}
                      {a.staffMemberId && !branchStaff.some((s) => s.id === a.staffMemberId) && <SelectItem value={a.staffMemberId}>{a.staffName ?? "(đã nghỉ)"}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </section>
            </div>

            <section className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-ai/15 bg-ai-soft/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <IconTile icon={Sparkles} tone="ai" variant="solid" size="sm" />
                Tóm tắt cho kỹ thuật viên
              </h3>
              {a.aiBrief ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {a.aiBrief}
                  {a.aiBriefAt && <p className="mt-2 text-xs text-muted-foreground">AI viết lúc {formatDateTimeTz(a.aiBriefAt, timeZone)} từ cuộc trò chuyện với khách.</p>}
                </div>
              ) : briefPending ? (
                <p role="status" className="flex items-center gap-1.5 text-sm text-ai">
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  AI đang viết...
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {a.source === "bot" ? "Chưa có tóm tắt." : "Chỉ có khi bot đặt lịch qua chat: AI tóm tắt nhu cầu khách đã nói để kỹ thuật viên nắm trước."}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2 text-sm">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Nhắc lịch</h3>
              <ul className="grid gap-2 sm:grid-cols-3">
                <ReminderStep label="Nhắc lần 1" at={a.reminder1SentAt} timeZone={timeZone} />
                <ReminderStep label="Nhắc lần 2" at={a.reminder2SentAt} timeZone={timeZone} />
                <ReminderStep label="Khách xác nhận" at={a.customerConfirmedAt} timeZone={timeZone} />
              </ul>
            </section>

            <NoteEditor appointmentId={appointmentId} note={a.note} onSaved={reload} />

            <Timeline events={data.events} timeZone={timeZone} />
          </div>
        )}

        {invoiceId && (
          <InvoiceDetailDialog
            invoiceId={invoiceId}
            onClose={() => setInvoiceId(null)}
            onChanged={() => {
              reload();
              onChanged();
            }}
          />
        )}

        <AlertDialog open={cancelOpen} onOpenChange={(next) => !busy && setCancelOpen(next)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hủy lịch hẹn này?</AlertDialogTitle>
              <AlertDialogDescription>Khách sẽ không được nhắc nữa. Nếu khách đặt qua Zalo, hãy nhắn cho khách biết.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apt-cancel-reason">Lý do (không bắt buộc)</Label>
              <Textarea id="apt-cancel-reason" rows={2} maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Khách báo bận..." />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Giữ lịch</AlertDialogCancel>
              <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
                {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {busy ? "Đang hủy..." : "Hủy lịch"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function NoteEditor({ appointmentId, note, onSaved }: { appointmentId: string; note: string | null; onSaved: () => void }) {
  const [value, setValue] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const dirty = value !== (note ?? "");

  async function save() {
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.PUT("/appointments/{appointmentId}/note", { params: { path: { appointmentId } }, body: { note: value.trim() || null } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setSaved(true);
    onSaved();
  }

  return (
    <section className="flex flex-col gap-2">
      <Label htmlFor="apt-note" className="text-sm font-semibold">
        Ghi chú
      </Label>
      <Textarea
        id="apt-note"
        rows={2}
        maxLength={2000}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="Yêu cầu riêng, lưu ý cho kỹ thuật viên..."
        aria-invalid={Boolean(problem?.fieldErrors.note)}
      />
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem.fieldErrors.note ?? problemMessage(problem)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" className="h-11 sm:h-8" disabled={saving || !dirty} onClick={() => void save()}>
          {saving ? "Đang lưu..." : "Lưu ghi chú"}
        </Button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
            <CircleCheck className="size-4" aria-hidden />
            Đã lưu
          </span>
        )}
      </div>
    </section>
  );
}

/** Một bước nhắc lịch: đã làm (dấu tích xanh + giờ) hoặc "chưa". */
function ReminderStep({ label, at, timeZone }: { label: string; at: string | null; timeZone: string }) {
  return (
    <li className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2", at ? "border-success/25 bg-success/[0.06]" : "bg-muted/40")}>
      {at ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-xs font-medium">{label}</span>
        <span className={cn("truncate text-xs tabular", at ? "text-success" : "text-muted-foreground")}>{at ? formatDateTimeTz(at, timeZone) : "Chưa"}</span>
      </span>
    </li>
  );
}

function Timeline({ events, timeZone }: { events: AppointmentEvent[]; timeZone: string }) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Lịch sử</h3>
      <ol className="ml-1 flex flex-col gap-2.5 border-l-2 border-primary/15 pl-4 text-sm">
        {sorted.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn("absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-4 ring-card", i === 0 ? "bg-active-gradient" : "bg-primary/40")}
              aria-hidden
            />
            <span className="font-medium">{eventKindLabel(e.kind)}</span>
            <span className="text-muted-foreground">
              {actorLabel(e.actor)} · {formatDateTimeTz(e.at, timeZone)}
            </span>
            {e.data && <span className="basis-full text-xs break-all text-muted-foreground">{formatEventData(e.data)}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** `data` là JSON tự do từ BE; hiện gọn dạng "khóa: giá trị", không parse được thì hiện nguyên. */
function formatEventData(data: string): string {
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" · ");
    }
    return data;
  } catch {
    return data;
  }
}
