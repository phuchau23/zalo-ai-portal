"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, ChevronRight, CircleAlert, KeyRound, Plus } from "lucide-react";
import { CopyButton } from "@/components/common/copy-button";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { call } from "@/lib/api/call";
import { api, type AdminTenant, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { expiryState, formatVnDate, quotaLabel, tenantStatusLabel, vnDateToIso } from "@/lib/admin";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { formatUsd, formatVnd } from "../chat-test/labels";
import { Field } from "./field";

type Created = Schemas["CreateTenantResponse"];

export function AdminTenants() {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/admin/tenants")));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const tenants = data ?? [];
  const costThisMonth = tenants.reduce((sum, t) => sum + t.aiCostThisMonthUsd, 0);
  const active = tenants.filter((t) => t.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border lg:grid-cols-3">
        <Summary label="Doanh nghiệp" value={data ? `${tenants.length}` : "—"} hint={data ? `${active} đang hoạt động` : ""} />
        <Summary label="Chi phí AI tháng này" value={data ? formatUsd(costThisMonth) : "—"} hint={data ? `≈ ${formatVnd(costThisMonth)}` : ""} />
        <Summary
          label="Hội thoại tháng này"
          value={data ? tenants.reduce((sum, t) => sum + t.conversationsThisMonth, 0).toLocaleString("vi-VN") : "—"}
          hint="Khách thật, không tính Chat thử"
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Doanh nghiệp"
          actions={
            !creating && (
              <Button onClick={() => setCreating(true)} className="h-11 sm:h-9">
                <Plus aria-hidden />
                Tạo doanh nghiệp
              </Button>
            )
          }
        />
        {creating && (
          <CreateTenantForm
            onCancel={() => setCreating(false)}
            onCreated={(result) => {
              setCreating(false);
              setCreated(result);
              reload();
            }}
          />
        )}

        {problem && !data ? (
          <ErrorState problem={problem} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingRows rows={3} columns={4} label="Đang tải danh sách doanh nghiệp" />
        ) : tenants.length === 0 ? (
          <EmptyState icon={Building2} title="Chưa có doanh nghiệp" description="Tạo doanh nghiệp đầu tiên rồi gửi tài khoản cho chủ doanh nghiệp." />
        ) : (
          <ul className="flex flex-col divide-y rounded-md border">
            {tenants.map((t) => (
              <TenantRow key={t.id} tenant={t} />
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={created !== null} onOpenChange={(open) => !open && setCreated(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đã tạo doanh nghiệp</AlertDialogTitle>
            <AlertDialogDescription>
              {created?.temporaryPassword
                ? "Gửi email và mật khẩu tạm này cho chủ doanh nghiệp qua kênh riêng (Zalo cá nhân, gọi điện). Mật khẩu chỉ hiện MỘT lần, đóng hộp này là không xem lại được."
                : "Email này đã có tài khoản, nên được thêm làm chủ doanh nghiệp và giữ mật khẩu cũ."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {created && (
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{created.ownerEmail}</dd>
              {created.temporaryPassword && (
                <>
                  <dt className="text-muted-foreground">Mật khẩu tạm</dt>
                  <dd className="flex items-center gap-2">
                    <code className="font-mono font-semibold">{created.temporaryPassword}</code>
                    <CopyButton text={created.temporaryPassword} />
                  </dd>
                </>
              )}
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogAction>Đã lưu, đóng lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="-mb-px -ml-px flex flex-col gap-1.5 border-b border-l p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function TenantRow({ tenant: t }: { tenant: AdminTenant }) {
  const expiry = expiryState(t.expiresAt);
  const overQuota = t.quota !== null && t.conversationsThisMonth >= t.quota;
  return (
    <li>
      <Link
        href={`/admin/${t.id}`}
        className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{t.name}</span>
            <Badge variant={t.status === "active" ? "success" : "destructive"}>{tenantStatusLabel(t.status, t.suspendedReason)}</Badge>
            <Badge variant="secondary">{t.planName}</Badge>
          </div>
          <p className="text-sm break-all text-muted-foreground">
            {t.industryName} · {t.ownerEmail ?? "chưa có chủ"}
          </p>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <dt>Hội thoại tháng:</dt>
              <dd className={cn("tabular", overQuota ? "font-medium text-destructive" : "text-foreground")}>{quotaLabel(t.conversationsThisMonth, t.quota)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>AI tháng này:</dt>
              <dd className="tabular text-foreground">{formatUsd(t.aiCostThisMonthUsd)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Tháng trước:</dt>
              <dd className="tabular text-foreground">{formatUsd(t.aiCostLastMonthUsd)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Hạn thuê:</dt>
              <dd className={cn(expiry.kind === "none" ? "text-foreground" : "font-medium text-warning")}>
                {t.expiresAt ? formatVnDate(t.expiresAt) : "không thời hạn"}
                {expiry.kind === "soon" && ` (còn ${expiry.daysLeft} ngày)`}
                {expiry.kind === "expired" && ` (quá ${expiry.daysOver} ngày)`}
              </dd>
            </div>
          </dl>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

type FormValues = { name: string; industrySlug: string; botName: string; ownerEmail: string; ownerName: string; plan: string; expiresOn: string; quota: string };

function CreateTenantForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (created: Created) => void }) {
  const { data: plans } = useApiData(() => call(() => api.GET("/admin/plans")));
  const { data: industries } = useApiData(() => call(() => api.GET("/industries")));
  const [values, setValues] = useState<FormValues>({ name: "", industrySlug: "spa", botName: "", ownerEmail: "", ownerName: "", plan: "trial", expiresOn: "", quota: "" });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const update = (patch: Partial<FormValues>) => setValues((v) => ({ ...v, ...patch }));
  const errors = problem?.fieldErrors ?? {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/admin/tenants", {
        body: {
          name: values.name.trim(),
          industrySlug: values.industrySlug,
          botName: values.botName.trim() || null,
          ownerEmail: values.ownerEmail.trim(),
          ownerName: values.ownerName.trim(),
          plan: values.plan,
          expiresAt: vnDateToIso(values.expiresOn),
          conversationQuota: values.quota.trim() === "" ? null : Number(values.quota),
        },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onCreated(result.data);
  }

  const selectedPlan = plans?.find((p) => p.code === values.plan);
  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4 rounded-md border p-4">
      <h3 className="text-sm font-semibold">Doanh nghiệp mới</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="t-name" label="Tên doanh nghiệp" error={errors.name}>
          <Input id="t-name" required maxLength={200} value={values.name} onChange={(e) => update({ name: e.target.value })} aria-invalid={Boolean(errors.name)} className="h-11 sm:h-9" />
        </Field>
        <Field id="t-industry" label="Ngành" error={errors.industrySlug}>
          <Select value={values.industrySlug} onValueChange={(v) => update({ industrySlug: v })}>
            <SelectTrigger id="t-industry" className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(industries ?? []).map((i) => (
                <SelectItem key={i.slug} value={i.slug}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="t-owner-name" label="Tên chủ doanh nghiệp" error={errors.ownerName}>
          <Input id="t-owner-name" required maxLength={200} value={values.ownerName} onChange={(e) => update({ ownerName: e.target.value })} aria-invalid={Boolean(errors.ownerName)} className="h-11 sm:h-9" />
        </Field>
        <Field id="t-owner-email" label="Email đăng nhập của chủ" hint="Email đã có tài khoản thì được thêm làm chủ, giữ mật khẩu cũ." error={errors.ownerEmail}>
          <Input id="t-owner-email" type="email" autoComplete="off" required maxLength={320} value={values.ownerEmail} onChange={(e) => update({ ownerEmail: e.target.value })} aria-invalid={Boolean(errors.ownerEmail)} className="h-11 sm:h-9" />
        </Field>
        <Field id="t-bot" label="Tên bot (không bắt buộc)" hint="Để trống thì là “Trợ lý”; chủ doanh nghiệp tự đổi sau." error={errors.botName}>
          <Input id="t-bot" maxLength={50} value={values.botName} onChange={(e) => update({ botName: e.target.value })} className="h-11 sm:h-9" />
        </Field>
        <Field id="t-plan" label="Gói" error={errors.plan}>
          <Select value={values.plan} onValueChange={(v) => update({ plan: v })}>
            <SelectTrigger id="t-plan" className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(plans ?? []).map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.name} — {p.conversationsPerMonth === null ? "không giới hạn" : `${p.conversationsPerMonth} hội thoại/tháng`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="t-expires" label="Hạn thuê (không bắt buộc)" hint="Để trống = không thời hạn. Quá hạn 3 ngày hệ thống tự khóa." error={errors.expiresAt}>
          <Input id="t-expires" type="date" value={values.expiresOn} onChange={(e) => update({ expiresOn: e.target.value })} className="h-11 sm:h-9" />
        </Field>
        <Field id="t-quota" label="Hạn mức riêng (không bắt buộc)" hint={`Để trống = theo gói (${selectedPlan?.conversationsPerMonth ?? "không giới hạn"}).`} error={errors.conversationQuota}>
          <Input id="t-quota" type="number" inputMode="numeric" min={0} value={values.quota} onChange={(e) => update({ quota: e.target.value })} aria-invalid={Boolean(errors.conversationQuota)} className="h-11 sm:h-9" />
        </Field>
      </div>
      {problem && Object.keys(problem.fieldErrors).length === 0 && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} className="h-11 sm:h-9">
          <KeyRound aria-hidden />
          {saving ? "Đang tạo..." : "Tạo và cấp tài khoản"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="h-11 sm:h-9">
          Hủy
        </Button>
      </div>
    </form>
  );
}
