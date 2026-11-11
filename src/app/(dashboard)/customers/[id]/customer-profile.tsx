"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  History,
  LoaderCircle,
  MessageSquareText,
  MessagesSquare,
  NotebookPen,
  Phone,
  Settings2,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { PageHeader } from "@/components/common/page-header";
import { LeadStatusBadge } from "@/components/common/lead-status-badge";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState } from "@/components/common/states";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type Appointment, type ContactDetail, type ContactNote } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { dateKeyOf, defaultTimeZone, formatDateTimeTz, isTerminal, safeTimeZone, serviceNames, splitByNow, statusLabel } from "@/lib/appointments";
import {
  careStatusLabels,
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
import { cn } from "@/lib/utils";
import { SuggestionCard } from "../../care/suggestion-card";
import { elapsed } from "../../inbox/inbox-utils";
import { CustomerInvoicesSection, CustomerPackagesSection, CustomerWalletSection } from "./sales-sections";

const autoStatus = "auto";

const autoSalutation = "auto";

/** Cách gọi khách (BE: CustomerSalutation). Không có "anh/chị": chưa biết giới tính thì bot gọi "mình". */
const salutations = [
  { value: "anh", label: "Anh (khách nam)" },
  { value: "chị", label: "Chị (khách nữ)" },
  { value: "cô", label: "Cô" },
  { value: "chú", label: "Chú" },
  { value: "bác", label: "Bác" },
] as const;

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
    return (
      <div role="status" aria-label="Đang tải hồ sơ khách" className="flex flex-col gap-6">
        <div className="skeleton h-8 w-32 rounded-full" />
        <div className="surface flex items-center gap-4 rounded-2xl p-6">
          <div className="skeleton size-16 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2.5">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-3 w-72 opacity-70" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const c = data.contact;
  const status = leadStatusOf(c.leadStatus);
  const latest = data.conversations[0];
  const openSuggestions = data.suggestions.filter((s) => s.status === "open");
  const pastSuggestions = data.suggestions.filter((s) => s.status !== "open");

  async function patch(body: { leadStatus?: string | null; tags?: string[] | null; proactiveEnabled?: boolean | null; salutation?: string | null }) {
    setActionProblem(null);
    const result = await call(() =>
      api.PATCH("/contacts/{contactId}", { params: { path: { contactId } }, body: { leadStatus: null, tags: null, proactiveEnabled: null, salutation: null, ...body } }),
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
      <Link
        href="/customers"
        className="group inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full border border-border/70 bg-card/80 py-1 pr-3.5 pl-2.5 text-sm text-muted-foreground shadow-card backdrop-blur transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        Khách hàng
      </Link>

      {/* Thẻ đầu hồ sơ: ảnh chữ cái lớn, tên, trạng thái, vài con số nhanh và việc hay làm. */}
      <section aria-labelledby="customer-name" className="surface relative isolate overflow-hidden rounded-2xl">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-28 bg-brand-gradient opacity-[0.13]" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-end">
          <PersonAvatar name={c.name} size="xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 id="customer-name" className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-[28px]">
              {c.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <LeadStatusBadge status={c.leadStatus} manual={c.leadStatusManual} />
              {c.isTest && <Badge variant="outline">Chat thử</Badge>}
              {c.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
              {c.salutation && <span className="text-xs">Bot gọi là “{c.salutation}”</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {latest && (
              <Link href={`/inbox?c=${latest.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
                <MessagesSquare aria-hidden />
                Mở hội thoại
              </Link>
            )}
            {latest && (
              <Button onClick={() => void analyze()} disabled={analyzing === "busy"} className="h-11 sm:h-9">
                {analyzing === "busy" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Bot aria-hidden />}
                AI chăm sóc khách này
              </Button>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-4 [&>div]:border-border/70 [&>div:nth-child(odd)]:border-r sm:[&>div]:border-r sm:[&>div:last-child]:border-r-0 [&>div:nth-child(-n+2)]:border-b sm:[&>div:nth-child(-n+2)]:border-b-0">
          <Fact icon={Phone} label="Số điện thoại" value={c.phone ?? "Chưa có"} muted={!c.phone} />
          <Fact icon={Clock3} label="Nhắn lần cuối" value={c.lastCustomerMessageAt ? `${elapsed(c.lastCustomerMessageAt, now)} trước` : "Chưa nhắn"} muted={!c.lastCustomerMessageAt} />
          <Fact icon={MessageSquareText} label="Hội thoại" value={`${data.conversations.length}`} />
          <Fact icon={NotebookPen} label="Ghi chú chăm sóc" value={`${data.notes.length}`} />
        </dl>
      </section>

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}
      {analyzing === "queued" && openSuggestions.length === 0 && (
        <p role="status" className="flex items-start gap-2.5 rounded-2xl border border-ai/20 bg-ai-soft px-4 py-3 text-sm text-foreground/85">
          <Bot className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
          AI đang đọc lại cuộc trò chuyện… Nếu phù hợp, bot sẽ tự nhắn khách hoặc báo bạn liên hệ; khách chưa cần chăm sóc thì không làm gì.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {openSuggestions.map((s) => (
            <SuggestionCard key={`${s.id}-${s.updatedAt}`} suggestion={s} members={members} isOwner={isOwner} now={now} onChanged={reload} showContact={false} />
          ))}

          <CustomerAppointments contactId={contactId} now={now} />

          <CustomerPackagesSection contactId={contactId} />

          <CustomerWalletSection contactId={contactId} />

          <CustomerInvoicesSection contactId={contactId} />

          <section aria-labelledby="journal" className="surface flex flex-col gap-5 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <IconTile icon={NotebookPen} size="sm" />
              <div className="flex flex-col gap-0.5">
                <h2 id="journal" className="text-base font-semibold tracking-tight">
                  Nhật ký chăm sóc
                </h2>
                <p className="text-sm text-pretty text-muted-foreground">
                  Ghi lại khách đã làm gì (dịch vụ đã dùng, lịch hẹn...). Đặt &quot;lúc chăm sóc lại&quot; để tới giờ đó AI tự nhắn hỏi thăm khách; chuyện cần người (phàn nàn, sức khỏe...) thì hiện ở trang Cần chăm sóc kèm tin nháp.
                </p>
              </div>
            </div>
            <NoteForm contactId={contactId} onAdded={reload} />
            {data.notes.length === 0 ? (
              <EmptyState compact icon={NotebookPen} title="Chưa có ghi chú" description="Ví dụ: “Đã làm massage 90 phút, hẹn tái khám” + ngày chăm sóc lại." />
            ) : (
              <ol className="relative flex flex-col gap-3 pl-8 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-transparent">
                {data.notes.map((n) => (
                  <NoteItem key={n.id} note={n} canDelete={isOwner || n.authorUserId === me.userId} contactId={contactId} onDeleted={reload} />
                ))}
              </ol>
            )}
          </section>

          {pastSuggestions.length > 0 && (
            <section aria-labelledby="care-history" className="surface flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <IconTile icon={History} tone="ai" size="sm" />
                <h2 id="care-history" className="text-base font-semibold tracking-tight">
                  Lịch sử gợi ý chăm sóc
                </h2>
              </div>
              <ul className="flex flex-col divide-y divide-border/70">
                {pastSuggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium">{triggerLabel(s.trigger)}</span>
                    <span className="tabular text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                    <Badge variant={s.status === "done" || s.status === "autosent" ? "success" : "secondary"} className="ml-auto">
                      {s.status === "done" ? (outcomeLabel(s.outcome) ?? "Đã xử lý") : (careStatusLabels[s.status] ?? s.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside aria-label="Cài đặt và thông tin khách" className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="surface flex flex-col gap-5 rounded-2xl p-4">
          <SideTitle icon={Settings2}>Cách chăm sóc khách này</SideTitle>
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
            <Label htmlFor="salutation">Cách bot gọi khách</Label>
            <Select value={c.salutationSource === "staff" && c.salutation ? c.salutation : autoSalutation} onValueChange={(v) => void patch({ salutation: v })}>
              <SelectTrigger id="salutation" className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={autoSalutation}>Tự động — hiện là &quot;{c.salutation ?? "mình"}&quot;</SelectItem>
                {salutations.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {c.salutationSource === "staff"
                ? "Bạn đã chọn, bot luôn gọi khách như vậy."
                : c.salutationSource === "customer"
                  ? "Khách tự xưng khi chat, bot gọi theo. Biết giới tính thì chọn để bot gọi đúng."
                  : "Chưa biết giới tính nên bot gọi khách là “mình”. Bot xưng “em”."}
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
            <p className="text-xs text-muted-foreground">
              Nhận tin ưu đãi:{" "}
              <span className="font-medium text-foreground">{c.consentSource === null ? "chưa có thông tin" : c.consentMarketing ? "Có" : "Không"}</span>
              {c.consentSource === "import" && " (từ danh sách doanh nghiệp nhập)"}
            </p>
          </section>
          </div>

          <div className="surface flex flex-col gap-4 rounded-2xl p-4">
            <TagEditor tags={c.tags} onChange={(tags) => void patch({ tags })} />
          </div>

          <section aria-labelledby="lead-fields" className="surface flex flex-col gap-3 rounded-2xl p-4">
            <SideTitle id="lead-fields" icon={Bot} tone="ai">
              Bot đã ghi lại
            </SideTitle>
            {data.leadFields.length === 0 ? (
              <p className="text-sm text-pretty text-muted-foreground">Khách chưa để lại thông tin. Bot tự ghi tên, số điện thoại, nhu cầu khi khách nói.</p>
            ) : (
              <dl className="flex flex-col gap-2">
                {data.leadFields.map((f) => (
                  <div key={f.key} className="flex flex-col gap-0.5 rounded-xl bg-muted/50 px-3 py-2">
                    <dt className="text-[11px] font-medium text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <Conversations detail={data} now={now} />

          {isOwner && <CustomerData contactId={contactId} name={c.name} />}
        </aside>
      </div>
    </div>
  );
}

const day = 24 * 60 * 60 * 1000;
/** Các đoạn ngày (tính từ hôm nay) để lấy lịch hẹn của khách, mỗi đoạn ≤ 62 ngày theo giới hạn của BE. */
const appointmentWindows: [number, number][] = [
  [-186, -124],
  [-124, -62],
  [-62, 0],
  [0, 62],
];

/** Lịch hẹn của khách: sắp tới + 5 lịch gần nhất đã qua (tính cả đã hủy). Bấm vào lịch → mở ngày đó trên trang Lịch hẹn. */
function CustomerAppointments({ contactId, now }: { contactId: string; now: number }) {
  const settings = useApiData(() => call(() => api.GET("/tenant/crm-settings")));
  const timeZone = safeTimeZone(settings.data?.timeZone ?? defaultTimeZone);
  // BE chỉ cho mỗi lần hỏi tối đa 62 ngày → hỏi song song 4 đoạn (~6 tháng trước, 2 tháng tới), gộp lại, bỏ trùng ở mép đoạn.
  const { data, problem, reload } = useApiData(async (): Promise<ApiResult<Appointment[]>> => {
    const start = Date.now();
    const results = await Promise.all(
      appointmentWindows.map(([from, to]) =>
        call(() =>
          api.GET("/appointments", {
            params: {
              query: {
                contactId,
                from: new Date(start + from * day).toISOString(),
                to: new Date(start + to * day).toISOString(),
                includeCancelled: true,
              },
            },
          }),
        ),
      ),
    );
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) return failed;
    const byId = new Map(results.flatMap((r) => (r.ok ? r.data : [])).map((a) => [a.id, a]));
    return { ok: true, data: [...byId.values()] };
  });
  const { upcoming, past } = splitByNow(data ?? [], now, 5);

  const row = (a: Appointment) => {
    const status = statusLabel(a.status);
    const muted = isTerminal(a.status) && a.status !== "done";
    const [datePart, timePart] = splitDateTime(formatDateTimeTz(a.startAt, timeZone));
    return (
      <li key={a.id}>
        <Link
          href={`/appointments?date=${dateKeyOf(a.startAt, timeZone)}`}
          className={cn(
            "group flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            muted && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex w-16 shrink-0 flex-col items-center rounded-lg px-1 py-1 text-center leading-tight",
              muted ? "bg-muted" : "bg-primary/10 text-primary",
            )}
          >
            <span className={cn("tabular text-sm font-semibold", muted && "line-through")}>{timePart || datePart}</span>
            {timePart && <span className="tabular text-[10px] font-medium opacity-80">{datePart}</span>}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{serviceNames(a.items) || "—"}</span>
              {a.source === "bot" && <Bot className="size-3.5 shrink-0 text-ai" aria-label="Bot đặt" />}
            </span>
            {a.staffName && <span className="truncate text-xs text-muted-foreground">{a.staffName}</span>}
          </span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </Link>
      </li>
    );
  };

  return (
    <section aria-labelledby="appointments" className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <IconTile icon={CalendarDays} size="sm" />
          <h2 id="appointments" className="text-base font-semibold tracking-tight">
            Lịch hẹn
          </h2>
        </div>
        <Link href={`/appointments?contactId=${contactId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 rounded-full sm:h-8")}>
          <CalendarPlus aria-hidden />
          Đặt lịch
        </Link>
      </div>
      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải lịch hẹn" className="flex flex-col gap-2">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl opacity-70" />
        </div>
      ) : data.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          Khách chưa có lịch hẹn nào.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {upcoming.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Sắp tới</h3>
              <ul className="flex flex-col gap-2">{upcoming.map(row)}</ul>
            </div>
          )}
          {past.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Đã qua</h3>
              <ul className="flex flex-col gap-2">{past.map(row)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** "08:30 15/10/2026" hoặc "15/10/2026 08:30" → [ngày, giờ] để hiện ô ngày-giờ gọn; định dạng lạ thì giữ nguyên. */
function splitDateTime(text: string): [string, string] {
  const time = text.match(/\b\d{1,2}:\d{2}\b/)?.[0] ?? "";
  const date = text.replace(time, "").replace(/[,\s]+/g, " ").trim();
  return [date, time];
}

function Conversations({ detail, now }: { detail: ContactDetail; now: number }) {
  return (
    <section aria-labelledby="conversations" className="surface flex flex-col gap-3 rounded-2xl p-4">
      <SideTitle id="conversations" icon={MessagesSquare}>
        Hội thoại
      </SideTitle>
      <ul className="flex flex-col gap-1.5">
        {detail.conversations.map((c) => (
          <li key={c.id}>
            <Link
              href={`/inbox?c=${c.id}`}
              className="group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-white", c.mode === "human" ? "bg-primary" : "bg-ai")}
                aria-hidden
              >
                {c.mode === "human" ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
              </span>
              <span className="flex-1">{c.mode === "human" ? "Nhân viên đang xử lý" : "Bot đang trả lời"}</span>
              <span className="tabular text-xs text-muted-foreground">{elapsed(c.lastMessageAt ?? c.createdAt, now)}</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Một con số nhanh trên thẻ đầu hồ sơ. */
function Fact({ icon: Icon, label, value, muted }: { icon: LucideIcon; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
        <dd className={cn("tabular truncate text-sm font-semibold", muted && "font-normal text-muted-foreground")}>{value}</dd>
      </div>
    </div>
  );
}

/** Tiêu đề nhỏ của một thẻ ở cột phải. */
function SideTitle({ id, icon, tone = "primary", children }: { id?: string; icon: LucideIcon; tone?: "primary" | "ai"; children: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <IconTile icon={icon} tone={tone} size="sm" />
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        {children}
      </h2>
    </div>
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
      <Label htmlFor="tag-input" className="flex items-center gap-2.5 text-sm font-semibold">
        <IconTile icon={Tag} size="sm" />
        Nhãn
      </Label>
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="size-4 text-primary" aria-hidden />
        Thêm ghi chú
      </p>
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
              <Button key={p.label} type="button" size="sm" variant="outline" className="h-11 rounded-full sm:h-8" onClick={() => setFollowUpAt(followUpPresets(Date.now())[i].value)}>
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
            Giờ Việt Nam. Tới giờ này (trễ khoảng 1–2 phút), AI đọc lại hội thoại rồi tự nhắn hỏi thăm khách (nếu Cài đặt để bot tự nhắn, trong khung giờ được nhắn); cần người thì hiện ở trang Cần chăm sóc.
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
    <li className="relative flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card p-3.5 shadow-card">
      <span
        className={cn(
          "absolute top-3 -left-8 flex size-7 items-center justify-center rounded-full text-white ring-4 ring-card",
          note.kind === "service" ? "bg-success" : note.kind === "appointment" ? "bg-info" : "bg-muted-foreground",
        )}
        aria-hidden
      >
        {note.kind === "service" ? <Bot className="size-3.5" /> : note.kind === "appointment" ? <CalendarDays className="size-3.5" /> : <NotebookPen className="size-3.5" />}
      </span>
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

const deleteWord = "XÓA";

/** Quyền của khách với dữ liệu cá nhân (chỉ owner): tải toàn bộ dữ liệu, hoặc xóa vĩnh viễn — phải gõ "XÓA" để xác nhận. */
function CustomerData({ contactId, name }: { contactId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const confirmed = typed.trim().toUpperCase() === deleteWord;

  async function remove() {
    if (!confirmed) return;
    setDeleting(true);
    setProblem(null);
    const result = await call(() => api.DELETE("/contacts/{contactId}", { params: { path: { contactId } } }));
    setDeleting(false);
    if (!result.ok) return setProblem(result.problem);
    router.replace("/customers");
  }

  return (
    <section aria-labelledby="customer-data" className="surface flex flex-col gap-2.5 rounded-2xl border-destructive/15 p-4">
      <div className="flex items-center gap-2.5">
        <IconTile icon={ShieldCheck} tone="muted" size="sm" />
        <h2 id="customer-data" className="text-sm font-semibold tracking-tight">
          Dữ liệu của khách
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">Khi khách yêu cầu xem lại hoặc xóa thông tin của họ. Mọi lần xuất, xóa đều được ghi lại.</p>
      <a href={`/api/contacts/${contactId}/export`} download className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-start sm:h-9")}>
        <Download aria-hidden />
        Tải toàn bộ dữ liệu (Excel)
      </a>
      <Button
        variant="ghost"
        className="h-11 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
        onClick={() => {
          setTyped("");
          setProblem(null);
          setOpen(true);
        }}
      >
        <Trash2 aria-hidden />
        Xóa khách và mọi dữ liệu
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vĩnh viễn khách “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa hồ sơ, toàn bộ tin nhắn, nhật ký chăm sóc và gợi ý chăm sóc của khách này. Không khôi phục được. Nếu khách cần bản sao, hãy tải dữ liệu
              trước khi xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-delete">
              Gõ <span className="font-semibold">{deleteWord}</span> để xác nhận
            </Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void remove()}
              autoComplete="off"
              className="h-11 sm:h-9"
            />
            {problem && (
              <p role="alert" className="text-sm text-destructive">
                {problemMessage(problem)}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Không xóa</AlertDialogCancel>
            <Button variant="destructive" disabled={!confirmed || deleting} onClick={() => void remove()}>
              {deleting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Trash2 aria-hidden />}
              {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
