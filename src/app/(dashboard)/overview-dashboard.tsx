"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, CircleHelp, Coins, MessageCircleQuestion, MessagesSquare, UserPlus, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { call } from "@/lib/api/call";
import { api, type Dashboard } from "@/lib/api/client";
import { botRate, dayLabel, dayLongLabel, niceMax, unansweredReasonLabel } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { formatUsd, formatVnd } from "./chat-test/labels";

const periods = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
] as const;

/** Dashboard của chủ doanh nghiệp (chỉ owner — BE trả 403 cho nhân viên). Không tính khung Chat thử. */
export function OverviewDashboard() {
  const [days, setDays] = useState<7 | 30>(7);
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/dashboard", { params: { query: { days } } })));

  function changePeriod(value: string) {
    const next = Number(value) === 30 ? 30 : 7;
    if (next === days) return;
    setDays(next);
    reload();
  }

  return (
    <section aria-labelledby="activity" className="flex flex-col gap-4">
      <SectionHeader
        title={<span id="activity">Hoạt động của bot</span>}
        description="Số liệu khách thật trên Zalo, không tính khung Chat thử."
        actions={
          <Tabs value={String(days)} onValueChange={changePeriod}>
            <TabsList aria-label="Khoảng thời gian">
              {periods.map((p) => (
                <TabsTrigger key={p.value} value={String(p.value)} className="min-h-11 px-4 sm:min-h-8">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải số liệu" className="h-72 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
          <KpiRow data={data} />
          <DailyChart data={data} />
          <Unanswered data={data} />
        </div>
      )}
    </section>
  );
}

function KpiRow({ data }: { data: Dashboard }) {
  const rate = botRate(data.botHandled, data.conversations);
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border lg:grid-cols-4">
      <Kpi icon={MessagesSquare} label="Hội thoại" value={data.conversations.toLocaleString("vi-VN")} hint={`${data.days} ngày qua`} />
      <Kpi
        icon={Bot}
        label="Bot tự xử lý"
        value={rate === null ? "—" : `${rate}%`}
        hint={rate === null ? "Chưa có hội thoại" : `${data.botHandled}/${data.conversations} hội thoại không cần nhân viên`}
      />
      <Kpi icon={UserPlus} label="Khách mới" value={data.newContacts.toLocaleString("vi-VN")} hint={`${data.newLeads} khách tiềm năng`} />
      <Kpi icon={Coins} label="Chi phí AI tháng này" value={formatUsd(data.aiCostUsdMonth)} hint={`≈ ${formatVnd(data.aiCostUsdMonth)}`} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="-mb-px -ml-px flex flex-col gap-1.5 border-b border-l p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Một chuỗi số (hội thoại/ngày) → cột đơn sắc, không cần chú thích; di chuột/focus từng cột để xem số; có bảng số liệu. */
function DailyChart({ data }: { data: Dashboard }) {
  const max = niceMax(Math.max(0, ...data.daily.map((d) => d.conversations)));
  const labelEvery = data.days > 7 ? 5 : 1;
  const ticks = Number.isInteger(max / 2) ? [max, max / 2, 0] : [max, 0];

  return (
    <figure className="flex flex-col gap-3 rounded-md border p-4">
      <figcaption className="text-sm font-medium">Hội thoại mỗi ngày</figcaption>
      {data.truncated && <p className="text-xs text-muted-foreground">Quá nhiều tin nhắn, biểu đồ có thể chưa đủ số liệu.</p>}
      <div className="flex gap-2">
        <div className="tabular flex h-44 w-7 shrink-0 flex-col justify-between text-right text-xs text-muted-foreground" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {t.toLocaleString("vi-VN")}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44" aria-hidden>
            {ticks.map((t, i) => (
              <div key={t} className={cn("absolute inset-x-0 border-t", i === ticks.length - 1 ? "border-border" : "border-dashed border-border/60")} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
            ))}
          </div>
          <ol className="relative flex h-44 items-end gap-0.5" aria-label="Số hội thoại theo ngày">
            {data.daily.map((d) => (
              <li
                key={d.date}
                tabIndex={0}
                aria-label={`${dayLongLabel(d.date)}: ${d.conversations} hội thoại`}
                className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="w-full rounded-t-[4px] bg-chart-1" style={{ height: `${(d.conversations / max) * 100}%` }} />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-sm group-hover:block group-focus-visible:block"
                >
                  <span className="text-muted-foreground">{dayLongLabel(d.date)}</span>{" "}
                  <span className="tabular font-medium">{d.conversations.toLocaleString("vi-VN")} hội thoại</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-1.5 flex gap-0.5 text-xs text-muted-foreground" aria-hidden>
            {data.daily.map((d, i) => (
              <span key={d.date} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                {(data.daily.length - 1 - i) % labelEvery === 0 ? dayLabel(d.date) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground sm:min-h-8">Xem dạng bảng</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Ngày</th>
              <th className="py-1.5 text-right font-medium">Hội thoại</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((d) => (
              <tr key={d.date} className="border-b last:border-0">
                <td className="py-1.5">{dayLongLabel(d.date)}</td>
                <td className="tabular py-1.5 text-right">{d.conversations.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function Unanswered({ data }: { data: Dashboard }) {
  return (
    <section aria-labelledby="unanswered" className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 id="unanswered" className="flex items-center gap-1.5 text-sm font-medium">
            <MessageCircleQuestion className="size-4 text-muted-foreground" aria-hidden />
            Câu bot chưa trả lời được
          </h3>
          <p className="text-sm text-muted-foreground">
            Bot đã chuyển nhân viên vì thiếu dữ liệu hoặc không chắc. Bổ sung vào kho kiến thức để lần sau bot tự trả lời. Số điện thoại, email đã được che.
          </p>
        </div>
        <Link href="/knowledge" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 shrink-0 sm:h-8")}>
          Mở kho kiến thức
        </Link>
      </div>
      {data.unanswered.length === 0 ? (
        <EmptyState icon={CircleHelp} title="Không có câu nào" description={`Trong ${data.days} ngày qua bot trả lời được mọi câu hỏi của khách.`} className="py-8" />
      ) : (
        <ul className="flex flex-col divide-y">
          {data.unanswered.map((q) => (
            <li key={`${q.conversationId}-${q.at}`} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm break-words">{q.question ?? <span className="text-muted-foreground">(không tìm thấy tin của khách)</span>}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={q.reason === "low_confidence" ? "warning" : "secondary"}>{unansweredReasonLabel(q.reason)}</Badge>
                  {formatDateTime(q.at)}
                </p>
              </div>
              <Link href={`/inbox?c=${q.conversationId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 self-start sm:h-8 sm:self-center")}>
                Xem hội thoại
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
