"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Activity, BarChart3, Bot, CircleHelp, Coins, MessageCircleQuestion, MessagesSquare, UserPlus, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { call } from "@/lib/api/call";
import { api, type Dashboard } from "@/lib/api/client";
import { botRate, dayLabel, dayLongLabel, niceMax, unansweredReasonLabel } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { easeOut } from "@/lib/motion";
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
    <section id="bot-activity" aria-labelledby="activity" className="flex scroll-mt-6 flex-col gap-4">
      <SectionHeader
        icon={Activity}
        tone="ai"
        title={<span id="activity">Hoạt động của bot</span>}
        description="Khách thật nhắn qua Zalo (không tính khung Chat thử): bot trả lời bao nhiêu, câu nào chưa trả lời được."
        actions={
          <Tabs value={String(days)} onValueChange={changePeriod}>
            <TabsList variant="pill" aria-label="Khoảng thời gian">
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
        <div role="status" aria-label="Đang tải số liệu" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={MessagesSquare} tone="primary" label="Hội thoại" value={data.conversations} hint={`${data.days} ngày qua`} />
      <Kpi
        icon={Bot}
        tone="ai"
        label="Bot tự xử lý"
        value={rate}
        format={percentText}
        hint={rate === null ? "Chưa có hội thoại" : `${data.botHandled}/${data.conversations} hội thoại không cần nhân viên`}
      />
      <Kpi icon={UserPlus} tone="success" label="Khách mới" value={data.newContacts} hint={`${data.newLeads} khách tiềm năng`} />
      <Kpi icon={Coins} tone="warning" label="Chi phí AI tháng này" text={formatUsd(data.aiCostUsdMonth)} hint={`≈ ${formatVnd(data.aiCostUsdMonth)}`} />
    </div>
  );
}

const plainNumber = (n: number) => n.toLocaleString("vi-VN");
const percentText = (n: number) => `${n}%`;

/** Ô số liệu: ô biểu tượng màu, số chạy (hoặc chữ sẵn như tiền USD), dòng giải thích. `value` null → "—". */
function Kpi({
  icon,
  tone,
  label,
  value,
  text,
  format = plainNumber,
  hint,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value?: number | null;
  text?: string;
  format?: (n: number) => string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-card">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <IconTile icon={icon} tone={tone} size="sm" />
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight">{text ?? (value === null || value === undefined ? "—" : <AnimatedNumber value={value} format={format} />)}</p>
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
    <figure className="surface flex flex-col gap-4 rounded-2xl p-5">
      <figcaption className="flex items-center gap-2.5 text-sm font-semibold">
        <IconTile icon={BarChart3} size="sm" />
        Hội thoại mỗi ngày
      </figcaption>
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
            {data.daily.map((d, i) => (
              <li
                key={d.date}
                tabIndex={0}
                aria-label={`${dayLongLabel(d.date)}: ${d.conversations} hội thoại`}
                className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <motion.div
                  className="w-full origin-bottom rounded-t-md bg-primary opacity-85 transition-opacity group-hover:opacity-100"
                  style={{ height: `${(d.conversations / max) * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, ease: easeOut, delay: Math.min(i * 0.02, 0.5) }}
                />
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
    <section aria-labelledby="unanswered" className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 id="unanswered" className="flex items-center gap-2.5 text-sm font-semibold">
            <IconTile icon={MessageCircleQuestion} tone="warning" size="sm" />
            Câu bot chưa trả lời được
          </h3>
          <p className="text-sm text-muted-foreground">
            Bot đã chuyển nhân viên vì thiếu dữ liệu hoặc không chắc. Bổ sung vào kho kiến thức để lần sau bot tự trả lời. Số điện thoại, email đã được che.
          </p>
        </div>
        <Link href="/knowledge" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 shrink-0 rounded-full sm:h-8")}>
          Mở kho kiến thức
        </Link>
      </div>
      {data.unanswered.length === 0 ? (
        <EmptyState icon={CircleHelp} title="Không có câu nào" description={`Trong ${data.days} ngày qua bot trả lời được mọi câu hỏi của khách.`} compact />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.unanswered.map((q) => (
            <li
              key={`${q.conversationId}-${q.at}`}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
