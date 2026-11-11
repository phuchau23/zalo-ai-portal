"use client";

import { Crown, HeartHandshake, Repeat, UserPlus, Users, Wallet } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { RadialMeter } from "@/components/charts/radial-meter";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { previousRange, rangeLabel } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort, percentText, ratio } from "./report-format";
import type { ReportTabProps } from "./reports-page";

/** Khách hàng: bao nhiêu khách đến, mới hay quay lại, giữ chân được bao nhiêu %, ai tiêu nhiều nhất. Mọi chi nhánh. */
export function CustomersTab({ params, canMoney }: ReportTabProps) {
  const { range } = params;
  const report = useApiQuery(() => call(() => api.GET("/reports/customers", { params: { query: { from: range.from, to: range.to } } })), `${range.from}|${range.to}`);
  const c = report.data;
  const returningShare = c ? ratio(c.returningCustomers, c.activeCustomers) : null;

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", report.stale && "opacity-70")}>
      {report.problem && <ErrorState problem={report.problem} onRetry={report.reload} />}
      {params.branchId && <p className="text-sm text-muted-foreground">Báo cáo khách tính cho mọi chi nhánh.</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard emphasis icon={Users} label="Khách đến" value={c?.activeCustomers ?? 0} format={count} hint="Khách có lịch hẹn trong khoảng" />
        <StatCard tint="peach" icon={UserPlus} tone="ai" label="Khách mới" value={c?.newCustomers ?? 0} format={count} hint="Lần đầu đến trong khoảng này" />
        <StatCard tint="sage" icon={Repeat} tone="success" label="Khách quay lại" value={c?.returningCustomers ?? 0} format={count} hint={returningShare === null ? undefined : `${percentText(returningShare)} số khách đến`} />
        {canMoney ? (
          <StatCard tint="sky" icon={Wallet} tone="warning" label="Chi tiêu trung bình" value={c?.averageSpend ?? 0} format={moneyShort} title={c ? money(c.averageSpend) : undefined} hint="Mỗi khách có trả tiền" />
        ) : (
          <StatCard icon={HeartHandshake} label="Giữ chân khách" value={c?.retentionPercent ?? 0} format={percentText} hint="Khách kỳ trước quay lại kỳ này" />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard icon={HeartHandshake} tone="success" title="Giữ chân khách" description={`Khách đến kỳ trước (${rangeLabel(previousRange(range))}) có quay lại kỳ này`} loading={report.loading} skeleton="ring">
          {c && (
            <div className="flex flex-col items-center gap-4 text-center">
              <RadialMeter value={c.retentionPercent} tone="success" size={136} label="Tỷ lệ giữ chân khách" caption="quay lại" />
              <p className="max-w-xs text-sm text-pretty text-muted-foreground">
                {c.retentionPercent >= 40
                  ? "Khách cũ quay lại đều — giữ nhịp chăm sóc sau buổi làm."
                  : "Nhiều khách chưa quay lại. Vào Cần chăm sóc để bot hoặc nhân viên nhắn hỏi thăm."}
              </p>
            </div>
          )}
        </ChartCard>
        <ChartCard icon={Users} title="Khách mới và quay lại" description="Cơ cấu khách đến trong khoảng" loading={report.loading} skeleton="ring" empty={!!c && c.activeCustomers === 0} emptyHint="Chưa có lịch hẹn nào trong khoảng này.">
          {c && (
            <DonutChart
              label="Khách mới và khách quay lại"
              totalLabel="Khách đến"
              size={148}
              slices={[
                { key: "new", label: "Khách mới", value: c.newCustomers },
                { key: "returning", label: "Khách quay lại", value: c.returningCustomers },
              ]}
              format={count}
            />
          )}
        </ChartCard>
        <ChartCard icon={Crown} tone="warning" title="Khách thân thiết" description={canMoney ? "Chi tiêu nhiều nhất trong khoảng" : "Đến nhiều nhất trong khoảng"} loading={report.loading} skeleton="list" empty={!!c && c.topCustomers.length === 0}>
          {c && (
            <BarList
              label="Khách thân thiết"
              tone="primary"
              limit={5}
              showShare={false}
              items={c.topCustomers.map((t) => ({
                key: t.id ?? t.name,
                label: t.name,
                value: canMoney ? t.amount : t.count,
                note: `${count(t.count)} hóa đơn`,
                href: t.id ? `/customers/${t.id}` : undefined,
              }))}
              format={canMoney ? moneyShort : (n) => `${n} lần`}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
