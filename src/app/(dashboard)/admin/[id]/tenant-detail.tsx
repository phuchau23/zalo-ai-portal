"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Download, Lock, LockOpen, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
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
import { isoToVnDate, monthLabel, quotaLabel, tenantStatusLabel, vnDateToIso } from "@/lib/admin";
import { niceMax } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { formatUsd, formatVnd } from "../../chat-test/labels";
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

  if (!data) {
    return <div role="status" aria-label="Đang tải doanh nghiệp" className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />;
  }

  const t = data.tenant;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin", label: "Quản trị hệ thống" }}
        title={t.name}
        meta={
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
            <Badge variant={t.status === "active" ? "success" : "destructive"}>{tenantStatusLabel(t.status, t.suspendedReason)}</Badge>
            <Badge variant="secondary">{t.planName}</Badge>
            <span>{t.industryName}</span>
            <span>Tạo {formatDateTime(t.createdAt)}</span>
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <SubscriptionForm detail={data} plans={plans ?? []} onSaved={reload} />
          <CostChart detail={data} />
          <section aria-labelledby="members" className="flex flex-col gap-2 rounded-md border p-4">
            <h2 id="members" className="text-sm font-medium">
              Tài khoản ({data.members.length})
            </h2>
            <ul className="flex flex-col divide-y text-sm">
              {data.members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="break-all text-muted-foreground">{m.email}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {m.role === "owner" ? "Chủ doanh nghiệp" : "Nhân viên"}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-6 rounded-md border bg-card p-4">
          <StatusSection detail={data} onChanged={reload} />
          <section className="flex flex-col gap-2 border-t pt-4">
            <h2 className="text-sm font-medium">Dữ liệu doanh nghiệp</h2>
            <p className="text-xs text-muted-foreground">
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
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">Gói và hạn thuê</h2>
        <p className="text-sm text-muted-foreground">
          Hội thoại tháng này: <span className="tabular font-medium text-foreground">{quotaLabel(t.conversationsThisMonth, t.quota)}</span>
        </p>
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
        <p className="text-sm text-muted-foreground">Doanh nghiệp đang tự khóa vì quá hạn. Gia hạn qua hôm nay rồi lưu là tự mở lại.</p>
      )}
      {problem && Object.keys(problem.fieldErrors).length === 0 && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving} className="h-11 sm:h-9">
          <Save aria-hidden />
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-success">
            Đã lưu.
          </p>
        )}
      </div>
    </form>
  );
}

/** Một chuỗi số (chi phí AI theo tháng) → cột đơn sắc; di chuột/focus xem số; có bảng số liệu. */
function CostChart({ detail }: { detail: AdminTenantDetail }) {
  const months = detail.monthlyCosts;
  const max = Math.max(...months.map((m) => m.costUsd), 0);
  const top = max === 0 ? 1 : max;
  const total = months.reduce((sum, m) => sum + m.costUsd, 0);
  return (
    <figure className="flex flex-col gap-3 rounded-md border p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Chi phí AI 12 tháng</span>
        <span className="text-xs text-muted-foreground">
          Tổng {formatUsd(total)} ≈ {formatVnd(total)}
        </span>
      </figcaption>
      <ol className="flex h-36 items-end gap-0.5 border-b" aria-label="Chi phí AI theo tháng">
        {months.map((m) => (
          <li
            key={m.month}
            tabIndex={0}
            aria-label={`Tháng ${monthLabel(m.month)}: ${formatUsd(m.costUsd)}, ${m.calls} lần gọi AI`}
            className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="w-full rounded-t-[4px] bg-chart-1" style={{ height: `${(m.costUsd / top) * 100}%` }} />
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-sm group-hover:block group-focus-visible:block"
            >
              <span className="text-muted-foreground">Tháng {monthLabel(m.month)}</span> <span className="tabular font-medium">{formatUsd(m.costUsd)}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-0.5 text-xs text-muted-foreground" aria-hidden>
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
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Trạng thái</h2>
      <p className="text-xs text-muted-foreground">
        {active
          ? "Khóa: người của doanh nghiệp không vào được web, bot ngừng trả lời khách, ngừng chăm sóc chủ động. Dữ liệu vẫn giữ nguyên."
          : "Mở khóa để doanh nghiệp dùng lại ngay."}
      </p>
      <Button variant={active ? "outline" : "default"} onClick={() => void toggle()} disabled={busy} className="h-11 justify-start sm:h-9">
        {active ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
        {busy ? "Đang lưu..." : active ? "Khóa doanh nghiệp" : "Mở khóa"}
      </Button>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problemMessage(problem)}
        </p>
      )}
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
    <section className="flex flex-col gap-2 border-t pt-4">
      <h2 className="text-sm font-medium text-destructive">Xóa doanh nghiệp</h2>
      <p className="text-xs text-muted-foreground">
        {locked
          ? "Xóa vĩnh viễn mọi dữ liệu: khách, tin nhắn, kho kiến thức, kết nối Zalo, tài khoản chỉ thuộc doanh nghiệp này. Không khôi phục được — tải dữ liệu trước."
          : "Khóa doanh nghiệp trước, rồi mới xóa được."}
      </p>
      <Button
        variant="ghost"
        disabled={!locked}
        onClick={() => {
          setTyped("");
          setProblem(null);
          setOpen(true);
        }}
        className="h-11 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
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
