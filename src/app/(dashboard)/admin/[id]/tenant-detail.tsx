"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  Crown,
  DatabaseZap,
  Download,
  Lock,
  LockOpen,
  MessagesSquare,
  Package,
  Save,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile } from "@/components/common/icon-tile";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { call } from "@/lib/api/call";
import { api, type AdminTenantDetail, type Plan } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { expiryState, formatVnDate, isoToVnDate, monthLabel, quotaLabel, tenantStatusLabel, vnDateToIso } from "@/lib/admin";
import { niceMax } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { easeOut } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { formatUsd, formatVnd } from "../../chat-test/labels";
import { ActionError, MotionItem, MotionList, SavedNote } from "../../settings/settings-ui";
import { StatTile } from "../admin-tenants";
import { Field } from "../field";

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/admin/tenants/{tenantId}", { params: { path: { tenantId } } })));
  const { data: plans } = useApiData(() => call(() => api.GET("/admin/plans")));

  if (problem && !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Doanh nghiệp" back={{ href: "/admin", label: "Quản trị hệ thống" }} />
        <ErrorState problem={problem} onRetry={reload} />
      </div>
    );
  }

  if (!data) return <DetailSkeleton />;

  const t = data.tenant;
  const active = t.status === "active";
  const expiry = expiryState(t.expiresAt);
  const owners = data.members.filter((m) => m.role === "owner").length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/admin", label: "Quản trị hệ thống" }} title="Chi tiết doanh nghiệp" icon={Building2} />

      {/* Thẻ đầu trang: ảnh chữ cái, tên, trạng thái, gói. */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
        className="surface relative flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-accent/40 to-transparent" />
        <PersonAvatar
          name={t.name}
          size="xl"
          className="relative"
          badge={<span className={cn("block size-4 rounded-full ring-2 ring-card", active ? "bg-success" : "bg-destructive")} />}
        />
        <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="text-xl font-bold tracking-tight text-balance sm:text-2xl">{t.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={active ? "success" : "destructive"}>{tenantStatusLabel(t.status, t.suspendedReason)}</Badge>
            <Badge variant="secondary" className="gap-1">
              <Package aria-hidden />
              {t.planName}
            </Badge>
            <span>{t.industryName}</span>
            <span aria-hidden>·</span>
            <span>Tạo {formatDateTime(t.createdAt)}</span>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={MessagesSquare} tone="success" label="Hội thoại tháng này" hint={t.quota === null ? "Không giới hạn" : `Hạn mức ${t.quota}`}>
          <AnimatedNumber value={t.conversationsThisMonth} />
        </StatTile>
        <StatTile icon={Bot} tone="ai" label="Chi phí AI 12 tháng" hint={`≈ ${formatVnd(data.monthlyCosts.reduce((s, m) => s + m.costUsd, 0))}`}>
          <span className="tabular">{formatUsd(data.monthlyCosts.reduce((s, m) => s + m.costUsd, 0))}</span>
        </StatTile>
        <StatTile icon={Users} label="Tài khoản" hint={`${owners} chủ doanh nghiệp`}>
          <AnimatedNumber value={data.members.length} />
        </StatTile>
        <StatTile
          icon={CalendarClock}
          tone={expiry.kind === "expired" ? "destructive" : expiry.kind === "soon" ? "warning" : "muted"}
          label="Hạn thuê"
          hint={expiry.kind === "soon" ? `Còn ${expiry.daysLeft} ngày` : expiry.kind === "expired" ? `Quá hạn ${expiry.daysOver} ngày` : t.expiresAt ? "Còn hạn" : "Không thời hạn"}
        >
          <span className="text-lg sm:text-xl">{t.expiresAt ? formatVnDate(t.expiresAt) : "—"}</span>
        </StatTile>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <SubscriptionForm detail={data} plans={plans ?? []} onSaved={reload} />
          <CostChart detail={data} />
          <section aria-labelledby="members" className="surface flex flex-col gap-4 p-5">
            <SectionHeader icon={Users} title={<span id="members">Tài khoản ({data.members.length})</span>} />
            <MotionList label="Tài khoản của doanh nghiệp" className="gap-2">
              {data.members.map((m) => (
                <MotionItem key={m.userId} className="flex flex-wrap items-center gap-3 p-3 shadow-none">
                  <PersonAvatar name={m.name} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs break-all text-muted-foreground">{m.email}</span>
                  </span>
                  <Badge variant={m.role === "owner" ? "warning" : "secondary"} className="gap-1">
                    {m.role === "owner" && <Crown aria-hidden />}
                    {m.role === "owner" ? "Chủ doanh nghiệp" : "Nhân viên"}
                  </Badge>
                </MotionItem>
              ))}
            </MotionList>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <StatusSection detail={data} onChanged={reload} />
          <section className="surface flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={DatabaseZap} size="sm" />
              <h2 className="text-sm font-semibold">Dữ liệu doanh nghiệp</h2>
            </div>
            <p className="text-xs text-pretty text-muted-foreground">
              File zip gồm khách hàng + tin nhắn + nhật ký chăm sóc, kho kiến thức (đúng mẫu để nhập lại) và tài liệu gốc. Gửi cho doanh nghiệp khi họ ngừng thuê.
              Lần tải được ghi lại.
            </p>
            <a href={`/api/admin/tenants/${tenantId}/export`} download className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-start sm:h-9")}>
              <Download aria-hidden />
              Tải toàn bộ dữ liệu (.zip)
            </a>
          </section>
          <PurgeSection detail={data} />
        </aside>
      </div>
    </div>
  );
}

function SubscriptionForm({ detail, plans, onSaved }: { detail: AdminTenantDetail; plans: Plan[]; onSaved: () => void }) {
  const t = detail.tenant;
  const [plan, setPlan] = useState(t.plan);
  const [expiresOn, setExpiresOn] = useState(isoToVnDate(t.expiresAt));
  const [quota, setQuota] = useState(t.quotaOverride === null ? "" : String(t.quotaOverride));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const planQuota = plans.find((p) => p.code === plan)?.conversationsPerMonth;
  const usage = t.quota ? Math.min(1, t.conversationsThisMonth / t.quota) : null;

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSaved(false);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.PUT("/admin/tenants/{tenantId}/subscription", {
        params: { path: { tenantId: t.id } },
        body: { plan, expiresAt: vnDateToIso(expiresOn), conversationQuota: quota.trim() === "" ? null : Number(quota) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setSaved(true);
    onSaved();
  }

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="surface flex flex-col gap-5 p-5">
      <SectionHeader icon={Package} title="Gói và hạn thuê" description="Đổi gói, gia hạn hoặc đặt hạn mức hội thoại riêng." />
      <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Hội thoại tháng này</span>
          <span className="tabular font-semibold">{quotaLabel(t.conversationsThisMonth, t.quota)}</span>
        </div>
        {usage !== null && (
          <span className="block h-2 w-full overflow-hidden rounded-full bg-background" aria-hidden>
            <motion.span
              className={cn("block h-full origin-left rounded-full", usage >= 1 ? "bg-destructive" : usage >= 0.8 ? "bg-warning" : "bg-active-gradient")}
              style={{ width: `${Math.max(usage * 100, 2)}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: easeOut }}
            />
          </span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="s-plan" label="Gói" error={errors.plan}>
          <Select value={plan} onValueChange={edit(setPlan)}>
            <SelectTrigger id="s-plan" className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="s-expires" label="Hạn thuê" hint="Trống = không thời hạn." error={errors.expiresAt}>
          <Input id="s-expires" type="date" value={expiresOn} onChange={(e) => edit(setExpiresOn)(e.target.value)} className="h-11 sm:h-9" />
        </Field>
        <Field id="s-quota" label="Hạn mức riêng" hint={`Trống = theo gói (${planQuota ?? "không giới hạn"}).`} error={errors.conversationQuota}>
          <Input id="s-quota" type="number" inputMode="numeric" min={0} value={quota} onChange={(e) => edit(setQuota)(e.target.value)} aria-invalid={Boolean(errors.conversationQuota)} className="h-11 sm:h-9" />
        </Field>
      </div>
      {t.status === "suspended" && t.suspendedReason === "expired" && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Doanh nghiệp đang tự khóa vì quá hạn. Gia hạn qua hôm nay rồi lưu là tự mở lại.
        </p>
      )}
      {problem && Object.keys(problem.fieldErrors).length === 0 && <ActionError problem={problem} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving} className="h-11 sm:h-9">
          <Save aria-hidden />
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
        <SavedNote show={saved}>Đã lưu.</SavedNote>
      </div>
    </form>
  );
}

/** Một chuỗi số (chi phí AI theo tháng) → cột dải màu mọc lên; di chuột/focus xem số; có bảng số liệu. */
function CostChart({ detail }: { detail: AdminTenantDetail }) {
  const months = detail.monthlyCosts;
  const max = Math.max(...months.map((m) => m.costUsd), 0);
  const top = max === 0 ? 1 : max;
  const total = months.reduce((sum, m) => sum + m.costUsd, 0);
  return (
    <figure className="surface flex flex-col gap-4 p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          <IconTile icon={BarChart3} tone="ai" size="sm" />
          <span className="text-base font-semibold tracking-tight">Chi phí AI 12 tháng</span>
        </span>
        <span className="rounded-full bg-ai-soft px-3 py-1 text-xs font-medium text-ai">
          Tổng {formatUsd(total)} ≈ {formatVnd(total)}
        </span>
      </figcaption>
      <ol className="flex h-40 items-end gap-1 border-b border-dashed" aria-label="Chi phí AI theo tháng">
        {months.map((m, i) => (
          <li
            key={m.month}
            tabIndex={0}
            aria-label={`Tháng ${monthLabel(m.month)}: ${formatUsd(m.costUsd)}, ${m.calls} lần gọi AI`}
            className="group relative flex h-full min-w-0 flex-1 items-end rounded-md outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <motion.div
              className="w-full origin-bottom rounded-t-md bg-primary opacity-85 transition-opacity group-hover:opacity-100"
              style={{ height: `${(m.costUsd / top) * 100}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: i * 0.03, ease: easeOut }}
            />
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-card-hover group-hover:block group-focus-visible:block"
            >
              <span className="text-muted-foreground">Tháng {monthLabel(m.month)}</span> <span className="tabular font-semibold">{formatUsd(m.costUsd)}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="-mt-2 flex gap-1 text-xs text-muted-foreground" aria-hidden>
        {months.map((m, i) => (
          <span key={m.month} className="min-w-0 flex-1 text-center whitespace-nowrap">
            {(months.length - 1 - i) % 3 === 0 ? monthLabel(m.month) : ""}
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground sm:min-h-8">Xem dạng bảng</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Tháng</th>
              <th className="py-1.5 text-right font-medium">Chi phí</th>
              <th className="py-1.5 text-right font-medium">Lần gọi</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-b last:border-0">
                <td className="py-1.5">{monthLabel(m.month)}</td>
                <td className="tabular py-1.5 text-right">{formatUsd(m.costUsd)}</td>
                <td className="tabular py-1.5 text-right">{m.calls.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <span className="sr-only">Trục cao nhất {formatUsd(niceMax(max))}</span>
    </figure>
  );
}

function StatusSection({ detail, onChanged }: { detail: AdminTenantDetail; onChanged: () => void }) {
  const t = detail.tenant;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const active = t.status === "active";

  async function toggle() {
    setBusy(true);
    setProblem(null);
    const path = { params: { path: { tenantId: t.id } } };
    const result = await call(() => (active ? api.POST("/admin/tenants/{tenantId}/suspend", path) : api.POST("/admin/tenants/{tenantId}/resume", path)));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onChanged();
  }

  return (
    <section className="surface flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={active ? LockOpen : Lock} tone={active ? "success" : "destructive"} size="sm" />
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">Trạng thái</h2>
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", active ? "text-success" : "text-destructive")}>
            <span className="relative flex size-2" aria-hidden>
              {active && <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />}
              <span className={cn("relative size-2 rounded-full", active ? "bg-success" : "bg-destructive")} />
            </span>
            {tenantStatusLabel(t.status, t.suspendedReason)}
          </span>
        </div>
      </div>
      <p className="text-xs text-pretty text-muted-foreground">
        {active
          ? "Khóa: người của doanh nghiệp không vào được web, bot ngừng trả lời khách, ngừng chăm sóc chủ động. Dữ liệu vẫn giữ nguyên."
          : "Mở khóa để doanh nghiệp dùng lại ngay."}
      </p>
      <Button variant={active ? "outline" : "default"} onClick={() => void toggle()} disabled={busy} className="h-11 justify-start sm:h-9">
        {active ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
        {busy ? "Đang lưu..." : active ? "Khóa doanh nghiệp" : "Mở khóa"}
      </Button>
      <ActionError problem={problem} />
    </section>
  );
}

function PurgeSection({ detail }: { detail: AdminTenantDetail }) {
  const t = detail.tenant;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const confirmed = typed.trim() === t.name.trim();
  const locked = t.status !== "active";

  async function purge() {
    if (!confirmed) return;
    setDeleting(true);
    setProblem(null);
    const result = await call(() => api.POST("/admin/tenants/{tenantId}/purge", { params: { path: { tenantId: t.id } }, body: { confirmName: typed.trim() } }));
    setDeleting(false);
    if (!result.ok) return setProblem(result.problem);
    router.replace("/admin");
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/[0.03] p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={TriangleAlert} tone="destructive" size="sm" />
        <h2 className="text-sm font-semibold text-destructive">Vùng nguy hiểm: xóa doanh nghiệp</h2>
      </div>
      <p className="text-xs text-pretty text-muted-foreground">
        {locked
          ? "Xóa vĩnh viễn mọi dữ liệu: khách, tin nhắn, kho kiến thức, kết nối Zalo, tài khoản chỉ thuộc doanh nghiệp này. Không khôi phục được — tải dữ liệu trước."
          : "Khóa doanh nghiệp trước, rồi mới xóa được."}
      </p>
      <Button
        variant="destructive"
        disabled={!locked}
        onClick={() => {
          setTyped("");
          setProblem(null);
          setOpen(true);
        }}
        className="h-11 justify-start sm:h-9"
      >
        <Trash2 aria-hidden />
        Xóa toàn bộ dữ liệu
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vĩnh viễn “{t.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ dữ liệu của doanh nghiệp bị xóa ngay và không khôi phục được. Trên Zalo, nhớ nhắc doanh nghiệp gỡ quyền của ứng dụng khỏi OA nếu họ không
              dùng nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-purge">
              Gõ đúng tên <span className="font-semibold">{t.name}</span> để xác nhận
            </Label>
            <Input id="confirm-purge" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="h-11 sm:h-9" />
            {problem && (
              <p role="alert" className="text-sm text-destructive">
                {problemMessage(problem)}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Không xóa</AlertDialogCancel>
            <Button variant="destructive" disabled={!confirmed || deleting} onClick={() => void purge()}>
              <Trash2 aria-hidden />
              {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Đang tải doanh nghiệp" className="flex flex-col gap-6">
      <div className="skeleton h-8 w-48 rounded-full" />
      <div className="surface flex items-center gap-5 p-6">
        <div className="skeleton size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-3 w-1/2 opacity-70" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  );
}
