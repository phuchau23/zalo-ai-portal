"use client";

import Link from "next/link";
import { ArrowRight, Bot, CalendarCheck2, CreditCard, PackageCheck, ReceiptText, Sun, TrendingUp, Users, Wallet } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { deltaPercent, periodLabel, periodLongLabel, rangeLabel } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort, percentText, ratio } from "./report-format";
import type { ReportTabProps } from "./reports-page";

const groupWord = { day: "ngày", week: "tuần", month: "tháng" } as const;

/** Tổng quan: 4 chỉ số chính của khoảng đã chọn + xu hướng doanh thu + hôm nay + bán chạy + cách thanh toán. */
export function OverviewTab({ params, canMoney, hrefFor }: ReportTabProps) {
  const { range, branchId, groupBy } = params;
  const key = `${range.from}|${range.to}|${branchId}|${groupBy}`;
  const branch = branchId ?? undefined;

  const revenue = useApiQuery(
    () => (canMoney ? call(() => api.GET("/reports/revenue", { params: { query: { from: range.from, to: range.to, branchId: branch, groupBy } } })) : Promise.resolve({ ok: true as const, data: null })),
    key,
  );
  const customers = useApiQuery(() => call(() => api.GET("/reports/customers", { params: { query: { from: range.from, to: range.to } } })), key);
  const ai = useApiQuery(() => call(() => api.GET("/reports/ai", { params: { query: { from: range.from, to: range.to } } })), key);
  const today = useApiQuery(() => call(() => api.GET("/reports/today", { params: { query: { branchId: branch } } })), `${branchId}`);

  const r = revenue.data;
  const c = customers.data;
  const a = ai.data;
  const problem = revenue.problem ?? customers.problem ?? ai.problem;
  const botShare = a ? ratio(a.conversationsHandledByBot, a.conversationsTotal) : null;

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", (revenue.stale || customers.stale || ai.stale) && "opacity-70")}>
      {problem && <ErrorState problem={problem} onRetry={() => [revenue, customers, ai].forEach((q) => q.reload())} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canMoney &&
          (r ? (
            <StatCard
              emphasis
              icon={Wallet}
              tone="success"
              label="Doanh thu"
              value={r.total}
              format={moneyShort}
              title={money(r.total)}
              delta={deltaPercent(r.total, r.previousTotal)}
              spark={r.series.map((s) => s.revenue)}
              hint={r.refunds ? `Đã trừ hoàn tiền ${money(r.refunds)}` : undefined}
            />
          ) : (
            <StatSkeleton />
          ))}
        {canMoney &&
          (r ? (
            <StatCard tint="sky"
              icon={ReceiptText}
              label="Hóa đơn"
              value={r.invoices}
              format={count}
              hint={r.invoices ? `Trung bình ${money(Math.round(r.total / r.invoices))} / hóa đơn` : "Chưa có hóa đơn nào được thu"}
            />
          ) : (
            <StatSkeleton />
          ))}
        {c ? (
          <StatCard tint="peach" icon={Users} tone="primary" label="Khách đến" value={c.activeCustomers} format={count} hint={`${count(c.newCustomers)} khách mới · ${count(c.returningCustomers)} khách quay lại`} />
        ) : (
          <StatSkeleton />
        )}
        {a ? (
          <StatCard tint="butter"
            icon={Bot}
            tone="ai"
            label="Bot tự xử lý"
            value={botShare ?? 0}
            format={(n) => (botShare === null ? "—" : percentText(n))}
            hint={a.conversationsTotal ? `${count(a.conversationsHandledByBot)}/${count(a.conversationsTotal)} hội thoại không cần nhân viên` : "Chưa có hội thoại nào"}
          />
        ) : (
          <StatSkeleton />
        )}
        {!canMoney && (c ? <StatCard icon={CalendarCheck2} label="Bot chốt lịch" tone="ai" value={a?.botBookedAppointments ?? 0} format={count} hint="Lịch hẹn khách tự đặt qua chat" /> : <StatSkeleton />)}
        {!canMoney && (c ? <StatCard icon={Users} label="Giữ chân khách" value={c.retentionPercent} format={percentText} hint="Khách kỳ trước quay lại kỳ này" /> : <StatSkeleton />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canMoney ? (
          <ChartCard
            className="lg:col-span-2"
            icon={TrendingUp}
            tone="success"
            title={`Doanh thu theo ${groupWord[groupBy]}`}
            description={`${rangeLabel(range)} · tiền đã thu, trừ hoàn tiền`}
            loading={revenue.loading}
            empty={!!r && r.total === 0}
            emptyHint="Chưa có khoản thu trong khoảng này. Thử chọn khoảng dài hơn ở góc phải."
            actions={
              <Link href={hrefFor("revenue")} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-10 rounded-full sm:h-8")}>
                Chi tiết
                <ArrowRight aria-hidden />
              </Link>
            }
          >
            {r && (
              <TrendChart
                data={r.series.map((s) => ({
                  key: s.period,
                  label: periodLabel(s.period, groupBy),
                  longLabel: periodLongLabel(s.period, groupBy),
                  value: s.revenue,
                  note: `${count(s.invoices)} hóa đơn`,
                }))}
                tone="brand"
                valueLabel="Doanh thu"
                formatAxis={moneyShort}
                formatValue={money}
                summary={`Doanh thu ${rangeLabel(range)}: tổng ${money(r.total)}.`}
              />
            )}
          </ChartCard>
        ) : (
          <ChartCard className="lg:col-span-2" icon={Users} title="Khách tiêu nhiều nhất" loading={customers.loading} skeleton="list" empty={!!c && c.topCustomers.length === 0}>
            {c && <BarList label="Khách tiêu nhiều nhất" items={c.topCustomers.map((t) => ({ key: t.id ?? t.name, label: t.name, value: t.count, note: undefined }))} format={(n) => `${n} lần`} showShare={false} />}
          </ChartCard>
        )}
        <TodayCard today={today.data} loading={today.loading} canMoney={canMoney} />
      </div>

      {canMoney && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            icon={PackageCheck}
            title="Bán chạy nhất"
            description="Dịch vụ, gói, sản phẩm mang về nhiều tiền nhất"
            loading={revenue.loading}
            skeleton="list"
            empty={!!r && r.byItem.length === 0}
            emptyHint="Có hóa đơn là danh sách sẽ hiện ở đây."
          >
            {r && <BarList label="Bán chạy nhất" items={r.byItem.map((i) => ({ key: i.id ?? i.name, label: i.name, value: i.amount, note: `${count(i.count)} lượt` }))} format={moneyShort} limit={5} />}
          </ChartCard>
          <ChartCard icon={CreditCard} title="Cách khách thanh toán" description="Tỷ lệ số tiền theo từng cách trả" loading={revenue.loading} skeleton="ring" empty={!!r && r.byPaymentMethod.length === 0}>
            {r && <DonutChart label="Cách khách thanh toán" totalLabel="Tổng thu" slices={r.byPaymentMethod.map((p) => ({ key: p.name, label: p.name, value: p.amount }))} format={moneyShort} />}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-7 w-32" />
      <div className="skeleton h-3 w-40" />
    </div>
  );
}

/** "Hôm nay" (luôn là hôm nay, không theo khoảng đã chọn): tiến độ lịch hẹn + tiền thu. */
function TodayCard({
  today,
  loading,
  canMoney,
}: {
  today: { appointments: number; done: number; upcoming: number; noShows: number; botBooked: number; revenue: number; newCustomers: number; openInvoices: number } | undefined;
  loading: boolean;
  canMoney: boolean;
}) {
  const progress = today && today.appointments ? Math.round((today.done / today.appointments) * 100) : 0;
  return (
    <ChartCard icon={Sun} title="Hôm nay" description="Tính từ 0 giờ, cập nhật khi mở trang" loading={loading} skeleton="list">
      {today && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">Lịch hẹn đã xong</span>
              <span className="text-sm font-semibold tabular-nums">
                {today.done}/{today.appointments}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Lịch hẹn đã xong hôm nay" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-active-gradient transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {canMoney && <Mini label="Đã thu" value={moneyShort(today.revenue)} />}
            <Mini label="Sắp tới" value={count(today.upcoming)} />
            <Mini label="Khách mới" value={count(today.newCustomers)} />
            <Mini label="Bot chốt lịch" value={count(today.botBooked)} ai />
            {today.noShows > 0 && <Mini label="Không đến" value={count(today.noShows)} warn />}
            {canMoney && today.openInvoices > 0 && <Mini label="Còn nợ (mọi ngày)" value={count(today.openInvoices)} warn />}
          </dl>
          <Link href="/appointments" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 w-full rounded-xl sm:h-9")}>
            <CalendarCheck2 aria-hidden />
            Mở lịch hẹn hôm nay
          </Link>
        </div>
      )}
    </ChartCard>
  );
}

function Mini({ label, value, ai, warn }: { label: string; value: string; ai?: boolean; warn?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5", ai && "border-ai/15 bg-ai-soft/60", warn && "border-warning/25 bg-warning/8")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-base font-semibold tabular-nums", ai && "text-ai", warn && "text-warning")}>{value}</dd>
    </div>
  );
}
