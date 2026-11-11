"use client";

import { Building2, CreditCard, Download, Layers, Megaphone, PackageCheck, ReceiptText, RotateCcw, TrendingUp, UserRoundCog, Wallet } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { deltaPercent, periodLabel, periodLongLabel, previousRange, rangeDays, rangeLabel, type GroupBy } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort } from "./report-format";
import type { ReportTabProps } from "./reports-page";

const groupOptions: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

/** Doanh thu đủ chiều: xu hướng (ngày/tuần/tháng), theo dịch vụ, nhân viên, chi nhánh, loại, cách thanh toán, nguồn khách + xuất Excel. */
export function RevenueTab({ params, canExport, onGroupBy }: ReportTabProps) {
  const { range, branchId, groupBy } = params;
  const query = { from: range.from, to: range.to, branchId: branchId ?? undefined, groupBy };
  const revenue = useApiQuery(() => call(() => api.GET("/reports/revenue", { params: { query } })), `${range.from}|${range.to}|${branchId}|${groupBy}`);
  const r = revenue.data;
  const prev = previousRange(range);
  const exportQuery = new URLSearchParams({ from: range.from, to: range.to, groupBy, ...(branchId ? { branchId } : {}) }).toString();
  const days = rangeDays(range);

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", revenue.stale && "opacity-70")}>
      {revenue.problem && <ErrorState problem={revenue.problem} onRetry={revenue.reload} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          emphasis
          icon={Wallet}
          tone="success"
          label="Doanh thu"
          value={r?.total ?? 0}
          format={moneyShort}
          title={r ? money(r.total) : undefined}
          delta={r ? deltaPercent(r.total, r.previousTotal) : undefined}
          hint={r ? `Kỳ trước (${rangeLabel(prev)}): ${money(r.previousTotal)}` : undefined}
          spark={r?.series.map((s) => s.revenue)}
        />
        <StatCard tint="sky" icon={ReceiptText} label="Hóa đơn đã thu" value={r?.invoices ?? 0} format={count} hint={r ? `Trung bình ${(r.invoices / days).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} hóa đơn/ngày` : undefined} />
        <StatCard tint="peach" icon={TrendingUp} label="Giá trị trung bình" value={r && r.invoices ? Math.round(r.total / r.invoices) : 0} format={moneyShort} title={r && r.invoices ? money(Math.round(r.total / r.invoices)) : undefined} hint="Mỗi hóa đơn" />
        <StatCard tint="butter" icon={RotateCcw} tone={r?.refunds ? "warning" : "muted"} label="Hoàn tiền" value={r?.refunds ?? 0} format={moneyShort} title={r ? money(r.refunds) : undefined} hint={r?.refunds ? "Đã trừ khỏi doanh thu" : "Không có khoản hoàn"} />
      </div>

      <ChartCard
        icon={TrendingUp}
        tone="success"
        title="Doanh thu theo thời gian"
        description={`${rangeLabel(range)} · rê chuột để xem từng ${groupBy === "day" ? "ngày" : groupBy === "week" ? "tuần" : "tháng"}`}
        loading={revenue.loading}
        empty={!!r && r.total === 0}
        emptyHint="Chưa có khoản thu trong khoảng này."
        actions={
          <>
            <Tabs value={groupBy} onValueChange={(v) => onGroupBy(v as GroupBy)}>
              <TabsList aria-label="Gộp theo">
                {groupOptions.map((g) => (
                  <TabsTrigger key={g.value} value={g.value} className="px-3 pointer-coarse:min-h-10">
                    {g.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {canExport && (
              <a
                href={`/api/reports/revenue/export?${exportQuery}`}
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden h-9 rounded-lg sm:inline-flex")}
              >
                <Download aria-hidden />
                Excel
              </a>
            )}
          </>
        }
        footer={
          canExport && (
            <a href={`/api/reports/revenue/export?${exportQuery}`} download className="inline-flex min-h-10 items-center gap-1.5 font-medium text-primary hover:underline sm:hidden">
              <Download className="size-3.5" aria-hidden />
              Tải Excel doanh thu
            </a>
          )
        }
      >
        {r && (
          <TrendChart
            height={300}
            data={r.series.map((s) => ({ key: s.period, label: periodLabel(s.period, groupBy), longLabel: periodLongLabel(s.period, groupBy), value: s.revenue, note: `${count(s.invoices)} hóa đơn` }))}
            tone="brand"
            valueLabel="Doanh thu"
            formatAxis={moneyShort}
            formatValue={money}
            summary={`Doanh thu ${rangeLabel(range)}, tổng ${money(r.total)}, kỳ trước ${money(r.previousTotal)}.`}
          />
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard icon={PackageCheck} title="Theo dịch vụ & sản phẩm" description="Mục nào mang về nhiều tiền nhất" loading={revenue.loading} skeleton="list" empty={!!r && r.byItem.length === 0}>
          {r && <BarList label="Doanh thu theo dịch vụ và sản phẩm" items={r.byItem.map((i) => ({ key: i.id ?? i.name, label: i.name, value: i.amount, note: `${count(i.count)} lượt bán` }))} format={moneyShort} />}
        </ChartCard>
        <ChartCard icon={UserRoundCog} title="Theo nhân viên" description="Doanh thu từ dịch vụ nhân viên đã làm" loading={revenue.loading} skeleton="list" empty={!!r && r.byStaff.length === 0} emptyHint="Gắn nhân viên vào dòng hóa đơn để thấy doanh thu từng người.">
          {r && <BarList label="Doanh thu theo nhân viên" tone="primary" items={r.byStaff.map((i) => ({ key: i.id ?? i.name, label: i.name, value: i.amount, note: `${count(i.count)} dòng hóa đơn` }))} format={moneyShort} />}
        </ChartCard>
        <ChartCard icon={Layers} title="Theo loại" description="Dịch vụ lẻ, gói liệu trình, sản phẩm…" loading={revenue.loading} skeleton="ring" empty={!!r && r.byKind.length === 0}>
          {r && <DonutChart label="Doanh thu theo loại" totalLabel="Tổng" slices={r.byKind.map((k) => ({ key: k.name, label: k.name, value: k.amount }))} format={moneyShort} />}
        </ChartCard>
        <ChartCard icon={CreditCard} title="Cách thanh toán" description="Tiền mặt, chuyển khoản, thẻ, thẻ trả trước" loading={revenue.loading} skeleton="ring" empty={!!r && r.byPaymentMethod.length === 0}>
          {r && <DonutChart label="Doanh thu theo cách thanh toán" totalLabel="Tổng thu" slices={r.byPaymentMethod.map((k) => ({ key: k.name, label: k.name, value: k.amount }))} format={moneyShort} />}
        </ChartCard>
        <ChartCard icon={Megaphone} tone="ai" title="Theo nguồn khách" description="Khách đến từ bot, nhân viên đặt, khách vãng lai…" loading={revenue.loading} skeleton="ring" empty={!!r && r.bySource.length === 0}>
          {r && <DonutChart label="Doanh thu theo nguồn khách" totalLabel="Tổng" slices={r.bySource.map((k) => ({ key: k.name, label: k.name, value: k.amount }))} format={moneyShort} />}
        </ChartCard>
        {r && r.byBranch.length > 1 && (
          <ChartCard icon={Building2} title="Theo chi nhánh" description="So sánh các chi nhánh trong cùng khoảng">
            <BarList label="Doanh thu theo chi nhánh" items={r.byBranch.map((i) => ({ key: i.id ?? i.name, label: i.name, value: i.amount, note: `${count(i.count)} hóa đơn` }))} format={moneyShort} />
          </ChartCard>
        )}
      </div>
    </div>
  );
}
