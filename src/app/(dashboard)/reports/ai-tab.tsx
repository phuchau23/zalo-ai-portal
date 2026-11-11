"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Bot, CalendarCheck2, CircleDollarSign, MessagesSquare, UserRoundCheck } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { RadialMeter } from "@/components/charts/radial-meter";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile } from "@/components/common/icon-tile";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { rangeLabel } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort, percentText, ratio, usd } from "./report-format";
import type { ReportTabProps } from "./reports-page";

/** Hiệu quả trợ lý AI: tiền bot mang về, hành trình từ tin nhắn đến lịch hoàn thành, tỷ lệ tự xử lý, chi phí AI. */
export function AiTab({ params, canMoney }: ReportTabProps) {
  const { range } = params;
  const report = useApiQuery(() => call(() => api.GET("/reports/ai", { params: { query: { from: range.from, to: range.to } } })), `${range.from}|${range.to}`);
  const a = report.data;
  const handled = a ? ratio(a.conversationsHandledByBot, a.conversationsTotal) : null;
  const doneRate = a ? ratio(a.botBookedDone, a.botBookedAppointments) : null;

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", report.stale && "opacity-70")}>
      {report.problem && <ErrorState problem={report.problem} onRetry={report.reload} />}

      <section aria-label="Kết quả trợ lý AI" className="relative isolate overflow-hidden rounded-2xl border border-ai/20 bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-xs font-semibold text-ai">
              <Bot className="size-3.5" aria-hidden />
              Trợ lý AI · {rangeLabel(range)}
            </span>
            {a ? (
              canMoney ? (
                <>
                  <p className="text-sm text-muted-foreground">Doanh thu từ lịch bot tự chốt và khách đã đến làm</p>
                  <p className="text-4xl font-bold tracking-tight text-brand-gradient sm:text-5xl" title={money(a.revenueFromBot)}>
                    <AnimatedNumber value={a.revenueFromBot} format={money} />
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Lịch hẹn khách tự đặt qua chat với bot</p>
                  <p className="text-4xl font-bold tracking-tight text-brand-gradient sm:text-5xl">
                    <AnimatedNumber value={a.botBookedAppointments} format={(n) => `${count(n)} lịch`} />
                  </p>
                </>
              )
            ) : (
              <div className="skeleton h-12 w-64" />
            )}
            {a && (
              <p className="max-w-xl text-sm text-pretty text-muted-foreground">
                Bot đã trả lời {count(a.conversationsTotal)} cuộc hội thoại, tự chốt {count(a.botBookedAppointments)} lịch hẹn, trong đó {count(a.botBookedDone)} lịch khách đã đến làm.
              </p>
            )}
          </div>
          {a && canMoney && a.aiCostUsd > 0 && a.revenueFromBot > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border bg-card/80 p-4 backdrop-blur">
              <IconTile icon={CircleDollarSign} tone="success" size="md" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Chi phí AI khoảng này</span>
                <span className="text-lg font-semibold tabular-nums">{usd(a.aiCostUsd)}</span>
                <span className="text-xs text-muted-foreground">để mang về {moneyShort(a.revenueFromBot)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" icon={MessagesSquare} tone="ai" title="Từ tin nhắn đến lịch hoàn thành" description="Mỗi bước giữ lại bao nhiêu" loading={report.loading} skeleton="list">
          {a && (
            <ol className="flex flex-col gap-2">
              <Step icon={MessagesSquare} label="Hội thoại với khách" value={a.conversationsTotal} base={a.conversationsTotal} />
              <Step icon={Bot} label="Bot tự xử lý, không cần nhân viên" value={a.conversationsHandledByBot} base={a.conversationsTotal} />
              <Step icon={CalendarCheck2} label="Bot tự chốt lịch hẹn" value={a.botBookedAppointments} base={a.conversationsTotal} />
              <Step icon={UserRoundCheck} label="Khách đã đến làm" value={a.botBookedDone} base={a.conversationsTotal} last />
            </ol>
          )}
        </ChartCard>
        <ChartCard icon={Bot} tone="ai" title="Bot tự xử lý" description="Hội thoại kết thúc mà không cần chuyển nhân viên" loading={report.loading} skeleton="ring">
          {a && (
            <div className="flex flex-col items-center gap-4 text-center">
              <RadialMeter value={handled} tone="ai" size={136} label="Tỷ lệ hội thoại bot tự xử lý" caption="tự xử lý" />
              <p className="text-sm text-muted-foreground">
                {count(a.conversationsTotal - a.conversationsHandledByBot)} hội thoại cần nhân viên. Bổ sung kiến thức để bot trả lời được nhiều hơn.
              </p>
              <Link href="/knowledge" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-full sm:h-8")}>
                <BookOpenText aria-hidden />
                Mở Kho kiến thức
                <ArrowRight aria-hidden />
              </Link>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard tint="sky" icon={CalendarCheck2} tone="ai" label="Lịch bot chốt" value={a?.botBookedAppointments ?? 0} format={count} hint="Khách tự đặt qua chat, hệ thống kiểm tra chỗ trống" />
        <StatCard icon={UserRoundCheck} tone="success" label="Khách đã đến làm" value={a?.botBookedDone ?? 0} format={count} hint={doneRate === null ? "Chưa có lịch bot chốt" : `${percentText(doneRate)} lịch bot chốt`} />
        <StatCard tint="butter" icon={CircleDollarSign} tone="muted" label="Chi phí AI" value={Math.round((a?.aiCostUsd ?? 0) * 100)} format={(n) => usd(n / 100)} hint={a && a.conversationsTotal ? `≈ ${usd(a.aiCostUsd / a.conversationsTotal)} mỗi hội thoại` : undefined} />
      </div>
    </div>
  );
}

/** Một bước của hành trình: thanh dài theo tỷ lệ so với bước đầu, số + % bên phải. */
function Step({ icon, label, value, base, last }: { icon: typeof Bot; label: string; value: number; base: number; last?: boolean }) {
  const pct = base > 0 ? Math.round((value / base) * 1000) / 10 : 0;
  return (
    <li className="flex items-center gap-3">
      <IconTile icon={icon} tone={last ? "success" : "ai"} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="shrink-0 text-sm tabular-nums">
            <span className="font-semibold">{count(value)}</span>
            <span className="ml-2 text-xs text-muted-foreground">{percentText(pct)}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none", last ? "bg-success" : "bg-primary")}
            style={{ width: `${Math.max(value > 0 ? 2 : 0, pct)}%` }}
          />
        </div>
      </div>
    </li>
  );
}
