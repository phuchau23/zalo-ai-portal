"use client";

import { useMemo } from "react";
import { CalendarClock, CalendarDays, Flame, Hourglass, Info, Lightbulb, TimerReset } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { heatmapGrid, periodLabel, periodLongLabel, rangeDays, rangeLabel, shiftDays, weekdayLong } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, percentText } from "./report-format";
import type { ReportTabProps } from "./reports-page";

/** BE tính lấp đầy tối đa 62 ngày (nặng: từng ngày × từng nhân viên/giường). Khoảng dài hơn → lấy 62 ngày cuối. */
const MAX_DAYS = 62;

const hours = (minutes: number) => `${(minutes / 60).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;

/** Lấp đầy lịch: % thời gian làm việc đã có khách theo ngày, giờ nào đông/vắng, gợi ý khung giờ nên chạy ưu đãi. */
export function OccupancyTab({ params }: ReportTabProps) {
  const clamped = rangeDays(params.range) > MAX_DAYS;
  const range = clamped ? { from: shiftDays(params.range.to, -(MAX_DAYS - 1)), to: params.range.to } : params.range;
  const report = useApiQuery(
    () => call(() => api.GET("/reports/occupancy", { params: { query: { from: range.from, to: range.to, branchId: params.branchId ?? undefined } } })),
    `${range.from}|${range.to}|${params.branchId}`,
  );
  const o = report.data;

  const totals = useMemo(() => {
    if (!o) return null;
    const booked = o.days.reduce((s, d) => s + d.bookedMinutes, 0);
    const available = o.days.reduce((s, d) => s + d.availableMinutes, 0);
    const grid = heatmapGrid(o.heatmap);
    const byDay = grid.rows.map((r) => ({ day: r.day, total: r.values.reduce((s, v) => s + v, 0) }));
    const quiet = byDay.filter((d) => o.days.some((x) => new Date(`${x.date}T00:00:00Z`).getUTCDay() === d.day && x.availableMinutes > 0)).sort((a, b) => a.total - b.total)[0];
    return { booked, available, appointments: grid.total, quiet };
  }, [o]);

  const columns = (o?.days ?? []).map((d) => ({
    key: d.date,
    label: periodLabel(d.date, "day"),
    longLabel: periodLongLabel(d.date, "day"),
    value: d.availableMinutes > 0 ? Math.round((d.bookedMinutes / d.availableMinutes) * 1000) / 10 : 0,
    note: d.availableMinutes > 0 ? `${hours(d.bookedMinutes)} / ${hours(d.availableMinutes)} có khách` : "Nghỉ (không có ca)",
  }));

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", report.stale && "opacity-70")}>
      {report.problem && <ErrorState problem={report.problem} onRetry={report.reload} />}
      {clamped && (
        <p className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
          <Info className="size-4 shrink-0 text-primary" aria-hidden />
          Lấp đầy lịch tính tối đa {MAX_DAYS} ngày gần nhất: {rangeLabel(range)}.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard emphasis icon={CalendarClock} label="Tỷ lệ lấp đầy" value={o?.utilizationPercent ?? 0} format={percentText} hint="Thời gian có khách / thời gian nhân viên có ca" />
        <StatCard tint="sage" icon={Hourglass} tone="success" label="Giờ có khách" value={totals ? Math.round(totals.booked / 60) : 0} format={(n) => `${count(n)} giờ`} hint={totals ? `Trên ${hours(totals.available)} giờ làm việc` : undefined} />
        <StatCard tint="butter" icon={TimerReset} tone="warning" label="Giờ còn trống" value={totals ? Math.max(0, Math.round((totals.available - totals.booked) / 60)) : 0} format={(n) => `${count(n)} giờ`} hint="Có thể nhận thêm khách" />
        <StatCard tint="sky" icon={CalendarDays} tone="ai" label="Lịch hẹn" value={totals?.appointments ?? 0} format={count} hint="Không tính lịch đã hủy" />
      </div>

      <ChartCard
        icon={CalendarClock}
        title="Lấp đầy theo ngày"
        description="Mỗi cột là một ngày; cột đậm là ngày đạt từ mức trung bình trở lên"
        loading={report.loading}
        empty={!!o && o.days.every((d) => d.availableMinutes === 0)}
        emptyHint="Chưa có ca làm trong khoảng này. Xếp ca cho nhân viên ở trang Nhân viên để tính được lấp đầy."
      >
        {o && (
          <ColumnChart
            data={columns}
            target={o.utilizationPercent}
            targetLabel={`TB ${percentText(o.utilizationPercent)}`}
            format={percentText}
            valueLabel="Tỷ lệ lấp đầy"
            summary={`Tỷ lệ lấp đầy từng ngày ${rangeLabel(range)}, trung bình ${percentText(o.utilizationPercent)}.`}
          />
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" icon={Flame} tone="warning" title="Giờ đông khách" description="Số lịch hẹn theo thứ và giờ bắt đầu — ô càng đậm càng đông" loading={report.loading} skeleton="list">
          {o && <Heatmap cells={o.heatmap} label={`Số lịch hẹn theo thứ và giờ, ${rangeLabel(range)}`} />}
        </ChartCard>
        <ChartCard icon={Lightbulb} tone="ai" title="Gợi ý" description="Dựa trên số liệu khoảng này" loading={report.loading} skeleton="list">
          {o && totals && (
            <ul className="flex flex-col gap-3 text-sm">
              {totals.quiet && (
                <Tip>
                  <strong>{weekdayLong[totals.quiet.day]}</strong> ít lịch nhất ({count(totals.quiet.total)} lịch). Thử ưu đãi riêng ngày này hoặc nhờ bot nhắn khách cũ.
                </Tip>
              )}
              {o.utilizationPercent < 50 ? (
                <Tip>Lịch mới lấp {percentText(o.utilizationPercent)}. Bật bot tự chốt lịch và nhắn khách lâu chưa quay lại để tăng khách.</Tip>
              ) : o.utilizationPercent > 85 ? (
                <Tip>Lịch gần kín ({percentText(o.utilizationPercent)}). Cân nhắc thêm ca hoặc nhân viên giờ cao điểm để không mất khách.</Tip>
              ) : (
                <Tip>Lấp đầy ở mức tốt ({percentText(o.utilizationPercent)}). Giữ nhịp chăm sóc khách sau buổi làm.</Tip>
              )}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 rounded-xl border border-ai/15 bg-ai-soft/50 p-3 leading-relaxed text-pretty">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
