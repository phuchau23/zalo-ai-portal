"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  KeyRound,
  Lock,
  Mail,
  MessagesSquare,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { PageHeader } from "@/components/common/page-header";
import { PersonAvatar } from "@/components/common/person-avatar";
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
import { type ApiProblem } from "@/lib/api/problem";
import { expiryState, formatVnDate, quotaLabel, tenantStatusLabel, vnDateToIso } from "@/lib/admin";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { formatUsd, formatVnd } from "../chat-test/labels";
import { ActionError, AddPanel, MotionItem, MotionList } from "../settings/settings-ui";
import { CredentialBox } from "../settings/team-section";
import { Field } from "./field";

type Created = Schemas["CreateTenantResponse"];

type TenantFilter = "all" | "active" | "locked" | "expiring";

/** Giá trị "mọi gói" của bộ lọc gói (không trùng tên gói nào). */
const allPlans = "__all__";

/** Chữ thường, bỏ dấu — tìm "an phat" ra "An Phát". */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

function needsRenewal(t: AdminTenant): boolean {
  return expiryState(t.expiresAt).kind !== "none";
}

export function AdminTenants() {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/admin/tenants")));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [filter, setFilter] = useState<TenantFilter>("all");
  const [plan, setPlan] = useState<string>(allPlans);
  const [query, setQuery] = useState("");

  const tenants = data ?? [];
  const costThisMonth = tenants.reduce((sum, t) => sum + t.aiCostThisMonthUsd, 0);
  const active = tenants.filter((t) => t.status === "active").length;
  const renewals = tenants.filter(needsRenewal).length;
  const conversations = tenants.reduce((sum, t) => sum + t.conversationsThisMonth, 0);
  const planNames = [...new Set(tenants.map((t) => t.planName))].sort((a, b) => a.localeCompare(b, "vi"));

  const matchesFilter = (t: AdminTenant) =>
    filter === "all" || (filter === "active" ? t.status === "active" : filter === "locked" ? t.status !== "active" : needsRenewal(t));
  const q = plain(query);
  const visible = tenants.filter(
    (t) => matchesFilter(t) && (plan === allPlans || t.planName === plan) && (!q || plain(`${t.name} ${t.ownerEmail ?? ""} ${t.industryName}`).includes(q)),
  );
  const filtered = filter !== "all" || plan !== allPlans || query.trim() !== "";

  function resetFilters() {
    setFilter("all");
    setPlan(allPlans);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ShieldCheck}
        title="Doanh nghiệp thuê"
        description="Các doanh nghiệp đang thuê: gói, hạn thuê, hạn mức hội thoại và chi phí AI. Chỉ tài khoản quản trị hệ thống thấy trang này."
        actions={
          !creating && (
            <Button onClick={() => setCreating(true)} className="h-11 sm:h-9">
              <Plus aria-hidden />
              Tạo doanh nghiệp
            </Button>
          )
        }
        help={
          <ul>
            <li>
              <strong>Tạo doanh nghiệp</strong>: hệ thống cấp mật khẩu tạm cho chủ doanh nghiệp (chỉ hiện 1 lần, nhớ chép lại).
            </li>
            <li>Mở một doanh nghiệp để đổi gói, gia hạn, đặt hạn mức hội thoại, khóa / mở khóa, xuất hoặc xóa dữ liệu.</li>
            <li>Quá hạn thuê 3 ngày hệ thống tự khóa; trước hạn 7 ngày chủ doanh nghiệp thấy băng nhắc gia hạn.</li>
          </ul>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Building2} label="Doanh nghiệp" hint={data ? `${active} đang hoạt động` : ""}>
          {data ? <AnimatedNumber value={tenants.length} /> : "—"}
        </StatTile>
        <StatTile icon={Bot} tone="ai" label="Chi phí AI tháng này" hint={data ? `≈ ${formatVnd(costThisMonth)}` : ""}>
          <span className="tabular">{data ? formatUsd(costThisMonth) : "—"}</span>
        </StatTile>
        <StatTile icon={MessagesSquare} tone="success" label="Hội thoại tháng này" hint="Khách thật, không tính Chat thử">
          {data ? <AnimatedNumber value={conversations} /> : "—"}
        </StatTile>
        <StatTile icon={CalendarClock} tone={renewals > 0 ? "warning" : "muted"} label="Cần gia hạn" hint="Sắp hết hạn trong 7 ngày hoặc đã quá hạn">
          {data ? <AnimatedNumber value={renewals} /> : "—"}
        </StatTile>
      </div>

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

      <FilterLayout
        onReset={filtered ? resetFilters : undefined}
        filters={
          <>
            <FilterSection label="Tìm doanh nghiệp" htmlFor="tenant-search">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="tenant-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tên, email chủ, ngành"
                  className="h-11 w-full rounded-xl pr-9 pl-9 sm:h-10 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Xóa ô tìm"
                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </FilterSection>
            <FilterSection label="Trạng thái">
              <FilterPills
                label="Lọc theo trạng thái"
                variant="list"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "Tất cả", count: tenants.length, icon: Building2, tone: "primary" },
                  { value: "active", label: "Đang hoạt động", count: active, icon: CircleCheck, tone: "success" },
                  { value: "locked", label: "Đã khóa", count: tenants.length - active, icon: Lock, tone: "muted" },
                  { value: "expiring", label: "Cần gia hạn", count: renewals, alert: true, icon: CalendarClock, tone: "warning" },
                ]}
              />
            </FilterSection>
            {planNames.length > 1 && (
              <FilterSection label="Gói">
                <FilterPills
                  label="Lọc theo gói"
                  variant="list"
                  value={plan}
                  onChange={setPlan}
                  options={[
                    { value: allPlans, label: "Mọi gói", count: tenants.length },
                    ...planNames.map((name) => ({ value: name, label: name, count: tenants.filter((t) => t.planName === name).length })),
                  ]}
                />
              </FilterSection>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-3">
            <IconTile icon={Building2} size="sm" />
            <div className="flex flex-col">
              <h2 className="text-base font-semibold tracking-tight">Danh sách doanh nghiệp</h2>
              <p className="text-sm text-muted-foreground">Bấm vào một doanh nghiệp để đổi gói, gia hạn, khóa hoặc xuất dữ liệu.</p>
            </div>
          </div>
          {data && (
            <p role="status" className="tabular text-sm text-muted-foreground">
              {filtered ? `${visible.length} / ${tenants.length} doanh nghiệp` : `${tenants.length} doanh nghiệp`}
            </p>
          )}
        </div>

        {problem && !data ? (
          <ErrorState problem={problem} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingRows rows={3} columns={4} label="Đang tải danh sách doanh nghiệp" />
        ) : tenants.length === 0 ? (
          <EmptyState icon={Building2} title="Chưa có doanh nghiệp" description="Tạo doanh nghiệp đầu tiên rồi gửi tài khoản cho chủ doanh nghiệp." />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border bg-card shadow-card">
            <EmptyState icon={SearchX} compact title="Không có doanh nghiệp nào khớp" description="Đổi bộ lọc hoặc từ khóa tìm.">
              <Button variant="outline" size="sm" className="h-11 sm:h-8" onClick={resetFilters}>
                Xóa lọc
              </Button>
            </EmptyState>
          </div>
        ) : (
          <MotionList key={`${filter}-${plan}-${q}`} label="Doanh nghiệp thuê">
            {visible.map((t) => (
              <TenantRow key={t.id} tenant={t} />
            ))}
          </MotionList>
        )}
      </FilterLayout>

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
          {created && <CredentialBox email={created.ownerEmail} password={created.temporaryPassword} />}
          <AlertDialogFooter>
            <AlertDialogAction>Đã lưu, đóng lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Thẻ thống kê: ô biểu tượng, số lớn (chạy số), dòng giải thích. */
export function StatTile({ icon, tone = "primary", label, hint, children }: { icon: LucideIcon; tone?: Tone; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="surface relative flex flex-col gap-3 overflow-hidden p-4">
      <div className="relative flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size="sm" />
        <p className="text-xs font-medium text-pretty text-muted-foreground">{label}</p>
      </div>
      <p className="relative text-2xl font-bold tracking-tight sm:text-[26px]">{children}</p>
      {hint && <p className="relative -mt-2 text-xs text-pretty text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TenantRow({ tenant: t }: { tenant: AdminTenant }) {
  const expiry = expiryState(t.expiresAt);
  const overQuota = t.quota !== null && t.conversationsThisMonth >= t.quota;
  const usage = t.quota ? Math.min(1, t.conversationsThisMonth / t.quota) : null;
  const active = t.status === "active";
  return (
    <MotionItem className="group">
      <Link
        href={`/admin/${t.id}`}
        className="flex items-start gap-3 rounded-xl p-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:items-center sm:gap-4 sm:p-4"
      >
        <PersonAvatar
          name={t.name}
          size="lg"
          badge={<span className={cn("block size-3.5 rounded-full ring-2 ring-card", active ? "bg-success" : "bg-destructive")} />}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{t.name}</span>
              <Badge variant={active ? "success" : "destructive"}>{tenantStatusLabel(t.status, t.suspendedReason)}</Badge>
              <Badge variant="secondary">{t.planName}</Badge>
            </div>
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>{t.industryName}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                <span className="break-all">{t.ownerEmail ?? "chưa có chủ"}</span>
              </span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <Metric label="Hội thoại tháng">
              <span className={cn("tabular", overQuota ? "font-semibold text-destructive" : "text-foreground")}>{quotaLabel(t.conversationsThisMonth, t.quota)}</span>
              {usage !== null && (
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className={cn("block h-full rounded-full", overQuota ? "bg-destructive" : usage >= 0.8 ? "bg-warning" : "bg-active-gradient")}
                    style={{ width: `${Math.max(usage * 100, 3)}%` }}
                  />
                </span>
              )}
            </Metric>
            <Metric label="AI tháng này">
              <span className="tabular text-foreground">{formatUsd(t.aiCostThisMonthUsd)}</span>
            </Metric>
            <Metric label="Tháng trước">
              <span className="tabular text-foreground">{formatUsd(t.aiCostLastMonthUsd)}</span>
            </Metric>
            <Metric label="Hạn thuê">
              <span
                className={cn(
                  expiry.kind === "expired" ? "font-semibold text-destructive" : expiry.kind === "soon" ? "font-semibold text-warning" : "text-foreground",
                )}
              >
                {t.expiresAt ? formatVnDate(t.expiresAt) : "không thời hạn"}
                {expiry.kind === "soon" && ` (còn ${expiry.daysLeft} ngày)`}
                {expiry.kind === "expired" && ` (quá ${expiry.daysOver} ngày)`}
              </span>
            </Metric>
          </dl>
        </div>
        <span
          className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground motion-reduce:transition-none sm:flex"
          aria-hidden
        >
          <ChevronRight className="size-4" />
        </span>
      </Link>
    </MotionItem>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
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
  const input = "h-11 bg-card sm:h-9";
  return (
    <AddPanel icon={Building2} title="Doanh nghiệp mới" description="Hệ thống tạo tài khoản chủ doanh nghiệp và cấp mật khẩu tạm (chỉ hiện một lần).">
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="t-name" label="Tên doanh nghiệp" error={errors.name}>
            <Input id="t-name" required maxLength={200} value={values.name} onChange={(e) => update({ name: e.target.value })} aria-invalid={Boolean(errors.name)} className={input} />
          </Field>
          <Field id="t-industry" label="Ngành" error={errors.industrySlug}>
            <Select value={values.industrySlug} onValueChange={(v) => update({ industrySlug: v })}>
              <SelectTrigger id="t-industry" className="h-11 w-full bg-card sm:h-9">
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
            <Input id="t-owner-name" required maxLength={200} value={values.ownerName} onChange={(e) => update({ ownerName: e.target.value })} aria-invalid={Boolean(errors.ownerName)} className={input} />
          </Field>
          <Field id="t-owner-email" label="Email đăng nhập của chủ" hint="Email đã có tài khoản thì được thêm làm chủ, giữ mật khẩu cũ." error={errors.ownerEmail}>
            <Input id="t-owner-email" type="email" autoComplete="off" required maxLength={320} value={values.ownerEmail} onChange={(e) => update({ ownerEmail: e.target.value })} aria-invalid={Boolean(errors.ownerEmail)} className={input} />
          </Field>
          <Field id="t-bot" label="Tên bot (không bắt buộc)" hint="Để trống thì là “Trợ lý”; chủ doanh nghiệp tự đổi sau." error={errors.botName}>
            <Input id="t-bot" maxLength={50} value={values.botName} onChange={(e) => update({ botName: e.target.value })} className={input} />
          </Field>
          <Field id="t-plan" label="Gói" error={errors.plan}>
            <Select value={values.plan} onValueChange={(v) => update({ plan: v })}>
              <SelectTrigger id="t-plan" className="h-11 w-full bg-card sm:h-9">
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
            <Input id="t-expires" type="date" value={values.expiresOn} onChange={(e) => update({ expiresOn: e.target.value })} className={input} />
          </Field>
          <Field id="t-quota" label="Hạn mức riêng (không bắt buộc)" hint={`Để trống = theo gói (${selectedPlan?.conversationsPerMonth ?? "không giới hạn"}).`} error={errors.conversationQuota}>
            <Input id="t-quota" type="number" inputMode="numeric" min={0} value={values.quota} onChange={(e) => update({ quota: e.target.value })} aria-invalid={Boolean(errors.conversationQuota)} className={input} />
          </Field>
        </div>
        {problem && Object.keys(problem.fieldErrors).length === 0 && <ActionError problem={problem} />}
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
    </AddPanel>
  );
}
