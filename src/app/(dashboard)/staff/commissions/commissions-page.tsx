"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  HandCoins,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Ticket,
  Trash2,
  UsersRound,
  Wallet,
} from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { PageHeader } from "@/components/common/page-header";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
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
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import type { ApiProblem } from "@/lib/api/problem";
import { hasPermission } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";
import { fadeUp, stagger } from "@/lib/motion";
import { monthKey, monthLabel, shiftMonth } from "@/lib/reports";
import { useApiData, useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort } from "../../reports/report-format";
import { StaffTabs } from "../staff-tabs";
import { rulePriority, ruleValueLabel, scopeLabels, type CommissionScope } from "./commission-rules";
import { RuleDialog } from "./rule-dialog";

type Statement = Schemas["CommissionStatementResponse"];
type Rule = Schemas["CommissionRuleResponse"];

/**
 * Hoa hồng (C5) theo tháng: mỗi nhân viên một bảng kê (đã trả / còn phải trả, từng khoản), chủ đánh dấu đã trả cả tháng.
 * Bên cạnh là các quy tắc tính, xếp đúng thứ tự hệ thống áp dụng. Nhân viên thường chỉ thấy bảng kê của mình.
 */
export function CommissionsPage() {
  const { me } = useSession();
  const tenant = me.currentTenant;
  const canPay = hasPermission(tenant, "view_company_revenue");
  const canEditRules = hasPermission(tenant, "manage_staff");
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const currentMonth = monthKey(now);
  const requested = search.get("period");
  const period = requested && /^\d{4}-\d{2}$/.test(requested) && requested <= currentMonth ? requested : currentMonth;

  const statements = useApiQuery(() => call(() => api.GET("/commissions", { params: { query: { period } } })), period);
  const rules = useApiData(() => call(() => api.GET("/commissions/rules")));
  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: true } } })));
  const items = useApiData(() => call(() => api.GET("/catalog", { params: { query: { includeInactive: false } } })));

  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const [paying, setPaying] = useState<Statement | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = statements.data ?? [];
  const total = list.reduce((s, x) => s + x.total, 0);
  const paid = list.reduce((s, x) => s + x.paid, 0);
  const forbidden = statements.problem?.status === 403;

  function setPeriod(next: string) {
    setNotice(null);
    router.replace(`${pathname}?period=${next}`, { scroll: false });
  }

  async function markPaid(s: Statement) {
    setBusy(true);
    setActionProblem(null);
    const result = await call(() => api.POST("/commissions/mark-paid", { body: { staffMemberId: s.staffMemberId, period } }));
    setBusy(false);
    setPaying(null);
    if (!result.ok) return setActionProblem(result.problem);
    setNotice(`Đã ghi nhận trả ${money(s.total - s.paid)} hoa hồng ${monthLabel(period).toLowerCase()} cho ${s.staffName}.`);
    statements.reload();
  }

  async function removeRule(rule: Rule) {
    setBusy(true);
    setActionProblem(null);
    const result = await call(() => api.DELETE("/commissions/rules/{ruleId}", { params: { path: { ruleId: rule.id } } }));
    setBusy(false);
    setDeleting(null);
    if (!result.ok) return setActionProblem(result.problem);
    rules.reload();
  }

  const staffName = (id: string | null) => (id ? (staff.data?.find((s) => s.id === id)?.displayName ?? "Nhân viên đã xóa") : null);
  const itemName = (id: string | null) => (id ? (items.data?.find((i) => i.id === id)?.name ?? "Mục đã ngưng bán") : null);
  const sortedRules = [...(rules.data ?? [])].sort((a, b) => rulePriority(a) - rulePriority(b));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={HandCoins}
        title="Hoa hồng"
        description="Tự tính khi hóa đơn thu đủ tiền hoặc khách dùng buổi trong gói. Hủy hóa đơn thì hoa hồng tự thu hồi."
        help={
          <ul>
            <li>
              Đặt <strong>quy tắc</strong> ở cột bên phải: theo phần trăm hoặc số tiền cố định, cho mọi người hoặc riêng từng người.
            </li>
            <li>Mỗi tháng, mở bảng kê từng nhân viên để xem từng khoản, rồi bấm “Đánh dấu đã trả” khi đã chi tiền.</li>
            <li>Nhân viên đăng nhập sẽ thấy bảng kê của chính mình.</li>
          </ul>
        }
        actions={<MonthStepper period={period} max={currentMonth} onChange={setPeriod} />}
      />
      <StaffTabs />

      <div aria-live="polite">
        {notice && (
          <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-sm text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
      </div>
      {actionProblem && <ErrorState problem={actionProblem} />}

      {forbidden ? (
        <EmptyState
          icon={UsersRound}
          title="Tài khoản chưa gắn hồ sơ nhân viên"
          description="Nhờ chủ doanh nghiệp gắn tài khoản của bạn vào hồ sơ nhân viên để xem hoa hồng của mình."
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-4">
            {statements.problem && <ErrorState problem={statements.problem} onRetry={statements.reload} />}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard emphasis icon={Wallet} tone="warning" label="Tổng hoa hồng" value={total} format={moneyShort} title={money(total)} hint={`${monthLabel(period)} · ${count(list.length)} nhân viên`} />
              <StatCard tint="sage" icon={BadgeCheck} tone="success" label="Đã trả" value={paid} format={moneyShort} title={money(paid)} />
              <StatCard tint="butter" icon={HandCoins} tone={total - paid > 0 ? "primary" : "muted"} label="Còn phải trả" value={total - paid} format={moneyShort} title={money(total - paid)} hint={total - paid > 0 ? "Đánh dấu khi đã chi" : "Đã trả đủ"} />
            </div>

            {statements.loading ? (
              <LoadingRows rows={4} columns={4} label="Đang tải bảng kê" />
            ) : list.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title={`Chưa có hoa hồng ${monthLabel(period).toLowerCase()}`}
                description={(rules.data?.length ?? 0) === 0 ? "Thêm quy tắc hoa hồng trước, rồi gắn nhân viên vào dòng hóa đơn khi bán." : "Hoa hồng xuất hiện khi hóa đơn có gắn nhân viên được thu đủ tiền."}
              />
            ) : (
              <motion.ul variants={stagger} initial="hidden" animate="show" className={cn("flex flex-col gap-3 transition-opacity", statements.stale && "opacity-70")}>
                {list.map((s) => (
                  <motion.li key={s.staffMemberId} variants={fadeUp}>
                    <StatementCard statement={s} canPay={canPay} onPay={() => setPaying(s)} />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>

          <section aria-labelledby="rules-title" className="surface flex flex-col rounded-2xl xl:sticky xl:top-6">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex items-start gap-3">
                <IconTile icon={ListChecks} size="sm" className="mt-0.5" />
                <div>
                  <h2 id="rules-title" className="text-[15px] font-semibold tracking-tight">
                    Quy tắc tính
                  </h2>
                  <p className="text-[13px] text-muted-foreground">Xếp theo thứ tự hệ thống áp dụng</p>
                </div>
              </div>
              {canEditRules && (
                <Button size="sm" onClick={() => setEditing("new")} className="h-10 rounded-full sm:h-8">
                  <Plus aria-hidden />
                  Thêm
                </Button>
              )}
            </header>
            {rules.problem && (
              <div className="px-5 pb-4">
                <ErrorState problem={rules.problem} onRetry={rules.reload} />
              </div>
            )}
            {rules.data && sortedRules.length === 0 && (
              <div className="mx-5 mb-5 rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                Chưa có quy tắc nào — chưa ai được tính hoa hồng.{canEditRules && " Bấm “Thêm” để đặt quy tắc đầu tiên, ví dụ 10% mọi dịch vụ."}
              </div>
            )}
            <ol className="flex flex-col divide-y border-t">
              {sortedRules.map((r) => {
                const who = staffName(r.staffMemberId);
                const scope = scopeLabels[r.scope as CommissionScope]?.label ?? r.scope;
                return (
                  <li key={r.id} className={cn("flex items-center gap-3 px-5 py-3", !r.isActive && "opacity-60")}>
                    {who ? <PersonAvatar name={who} size="sm" /> : <IconTile icon={UsersRound} tone="muted" size="sm" className="rounded-full" />}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{who ?? "Mọi nhân viên"}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {r.scope === "item" ? itemName(r.catalogItemId) : scope}
                        {r.note ? ` · ${r.note}` : ""}
                      </span>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="rounded-lg bg-primary/8 px-2 py-0.5 text-sm font-semibold text-primary tabular-nums">{ruleValueLabel(r.kind, r.value)}</span>
                      {!r.isActive && <span className="text-[11px] text-muted-foreground">Tạm ngưng</span>}
                    </span>
                    {canEditRules && (
                      <span className="flex shrink-0">
                        <Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={`Sửa quy tắc của ${who ?? "mọi nhân viên"}`} onClick={() => setEditing(r)}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive sm:size-8" aria-label={`Xóa quy tắc của ${who ?? "mọi nhân viên"}`} onClick={() => setDeleting(r)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {sortedRules.length > 1 && (
              <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                Một khoản chỉ dùng <strong className="font-medium text-foreground">một</strong> quy tắc: mục cụ thể → loại (dịch vụ/gói/sản phẩm) → mọi thứ. Cùng bậc thì quy tắc riêng của người đó thắng quy tắc chung.
              </p>
            )}
          </section>
        </div>
      )}

      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          staff={(staff.data ?? []).filter((s) => s.status === "active" || (editing !== "new" && s.id === editing.staffMemberId))}
          items={items.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            rules.reload();
          }}
        />
      )}

      <AlertDialog open={!!paying} onOpenChange={(open) => !open && !busy && setPaying(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đánh dấu đã trả hoa hồng?</AlertDialogTitle>
            <AlertDialogDescription>
              {paying && (
                <>
                  Ghi nhận đã chi <strong className="text-foreground">{money(paying.total - paying.paid)}</strong> cho {paying.staffName} ({monthLabel(period).toLowerCase()}). Khoản phát sinh sau
                  này trong tháng vẫn hiện là chưa trả.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Để sau</AlertDialogCancel>
            <Button disabled={busy} onClick={() => paying && void markPaid(paying)}>
              {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {busy ? "Đang lưu..." : "Đã trả"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !busy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa quy tắc này?</AlertDialogTitle>
            <AlertDialogDescription>Hoa hồng đã tính giữ nguyên. Các khoản sau này sẽ dùng quy tắc khác (nếu có). Muốn ngưng tạm thời thì sửa và tắt “Đang áp dụng”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Giữ lại</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => deleting && void removeRule(deleting)}>
              {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              Xóa quy tắc
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Chọn tháng: ‹ Tháng 11/2026 › (không đi quá tháng hiện tại). */
function MonthStepper({ period, max, onChange }: { period: string; max: string; onChange: (p: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-card" role="group" aria-label="Chọn tháng">
      <Button variant="ghost" size="icon" className="size-10 rounded-lg sm:size-8" aria-label="Tháng trước" onClick={() => onChange(shiftMonth(period, -1))}>
        <ChevronLeft aria-hidden />
      </Button>
      <span className="min-w-28 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {monthLabel(period)}
      </span>
      <Button variant="ghost" size="icon" className="size-10 rounded-lg sm:size-8" aria-label="Tháng sau" disabled={period >= max} onClick={() => onChange(shiftMonth(period, 1))}>
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}

/** Bảng kê một nhân viên: tổng, đã trả (thanh tiến độ), còn lại; mở ra xem từng khoản. */
function StatementCard({ statement: s, canPay, onPay }: { statement: Statement; canPay: boolean; onPay: () => void }) {
  const [open, setOpen] = useState(false);
  const remaining = s.total - s.paid;
  const pct = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0;
  const panelId = `statement-${s.staffMemberId}`;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <PersonAvatar name={s.staffName} size="md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{s.staffName}</span>
              {remaining <= 0 ? (
                <Badge className="border-success/25 bg-success/10 text-success">
                  <BadgeCheck aria-hidden />
                  Đã trả đủ
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning/40 text-warning">
                  Còn {moneyShort(remaining)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Đã trả ${pct}%`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-success transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {moneyShort(s.paid)} / {moneyShort(s.total)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-lg font-bold tracking-tight tabular-nums sm:hidden">{money(s.total)}</span>
          <span className="hidden text-right sm:flex sm:flex-col">
            <span className="text-lg leading-tight font-bold tracking-tight tabular-nums">{money(s.total)}</span>
            <span className="text-xs text-muted-foreground">{count(s.entries.length)} khoản</span>
          </span>
          <span className="flex gap-1.5">
            {canPay && remaining > 0 && (
              <Button size="sm" variant="outline" onClick={onPay} className="h-10 rounded-full sm:h-8">
                <BadgeCheck aria-hidden />
                Đánh dấu đã trả
              </Button>
            )}
            <Button size="icon" variant="ghost" aria-expanded={open} aria-controls={panelId} aria-label={open ? "Ẩn từng khoản" : "Xem từng khoản"} onClick={() => setOpen((v) => !v)} className="size-10 rounded-full sm:size-8">
              <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} aria-hidden />
            </Button>
          </span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="border-t bg-muted/20">
            <ul className="flex flex-col divide-y divide-border/70">
              {s.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <IconTile icon={e.redemptionId ? Ticket : ReceiptText} tone={e.redemptionId ? "ai" : "primary"} size="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{e.redemptionId ? "Buổi trong gói" : "Dòng hóa đơn"}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(e.at)} · trên {money(e.basis)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums">{money(e.amount)}</span>
                    <span className={cn("text-[11px]", e.paidAt ? "text-success" : "text-muted-foreground")}>{e.paidAt ? "Đã trả" : "Chưa trả"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

