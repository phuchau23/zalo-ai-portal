"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Bot, CalendarCheck2, CalendarDays, CalendarPlus, ReceiptText, Sun, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api, type Appointment, type Schemas } from "@/lib/api/client";
import { addDays, defaultTimeZone, formatTime, isTerminal, serviceNames, startOfDayIso, statusLabel, todayKey } from "@/lib/appointments";
import { formatMoney } from "@/lib/format";
import { compactVnd } from "@/lib/home";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

type Today = Schemas["TodayReport"];

/**
 * "Hôm nay": doanh thu, lịch hẹn, khách mới, hóa đơn (GET /reports/today) + các lịch còn lại trong ngày (mọi chi nhánh).
 * Không có quyền xem báo cáo thì chỉ hiện danh sách lịch.
 */
export function TodayPanel({ today, now }: { today: Today | undefined; now: number }) {
  const day = todayKey(defaultTimeZone, now);
  const from = startOfDayIso(day, defaultTimeZone);
  const to = startOfDayIso(addDays(day, 1), defaultTimeZone);
  const appointments = useApiData<Appointment[]>(() => call(() => api.GET("/appointments", { params: { query: { from, to } } })));

  const upcoming = useMemo(
    () =>
      (appointments.data ?? [])
        .filter((a) => !isTerminal(a.status) && new Date(a.endAt).getTime() >= now)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .slice(0, 5),
    [appointments.data, now],
  );

  return (
    <section aria-labelledby="today" className="surface flex flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <IconTile icon={Sun} variant="solid" size="md" />
          <div className="flex flex-col gap-0.5">
            <h2 id="today" className="text-base font-semibold tracking-tight">
              Hôm nay
            </h2>
            <p className="text-sm text-muted-foreground">Số liệu tính từ 0 giờ, mọi chi nhánh.</p>
          </div>
        </div>
        <Link href="/appointments" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 shrink-0 rounded-full sm:h-8")}>
          Mở lịch hẹn
          <ArrowRight aria-hidden />
        </Link>
      </div>

      {today && (
        <dl className="grid grid-cols-2 gap-2 px-3 pb-3 sm:gap-3 sm:px-5 sm:pb-5 lg:grid-cols-4">
          <Kpi
            icon={Wallet}
            tone="success"
            label="Doanh thu"
            value={today.revenue}
            format={compactVnd}
            title={formatMoney(today.revenue)}
            hint={today.revenue > 0 ? `Tiền mặt ${compactVnd(today.cash)} · CK ${compactVnd(today.transfer)}` : "Chưa có khoản thu"}
          />
          <Kpi
            icon={CalendarDays}
            tone="primary"
            label="Lịch hẹn"
            value={today.appointments}
            hint={`Xong ${today.done} · Sắp tới ${today.upcoming}${today.noShows ? ` · Không đến ${today.noShows}` : ""}`}
          />
          <Kpi
            icon={UserPlus}
            tone="ai"
            label="Khách mới"
            value={today.newCustomers}
            hint={today.botBooked ? `Bot chốt ${today.botBooked} lịch hôm nay` : "Khách nhắn hoặc đặt lịch lần đầu"}
          />
          <Kpi
            icon={ReceiptText}
            tone={today.openInvoices ? "warning" : "muted"}
            label="Hóa đơn"
            value={today.invoices}
            hint={today.openInvoices ? `${today.openInvoices} hóa đơn còn nợ` : "Không có hóa đơn còn nợ"}
          />
        </dl>
      )}

      <div className="flex flex-col gap-3 border-t px-5 py-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarCheck2 className="size-4 text-primary" aria-hidden />
          Lịch sắp tới
        </h3>
        {!appointments.data ? (
          <div role="status" aria-label="Đang tải lịch hẹn hôm nay" className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Không còn lịch hẹn nào trong hôm nay.</p>
            <Link href="/appointments?new=1" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 rounded-full sm:h-8")}>
              <CalendarPlus aria-hidden />
              Đặt lịch hẹn
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {upcoming.map((a) => {
              const status = statusLabel(a.status);
              return (
                <li key={a.id}>
                  <Link
                    href={`/appointments?date=${day}`}
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="tabular flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1 text-sm leading-tight font-semibold text-primary">
                      {formatTime(a.startAt, defaultTimeZone)}
                      <span className="text-[10px] font-medium opacity-75">{formatTime(a.endAt, defaultTimeZone)}</span>
                    </span>
                    <PersonAvatar name={a.contactName} size="sm" className="hidden sm:inline-flex" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{a.contactName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {serviceNames(a.items)}
                        {a.staffName ? ` · ${a.staffName}` : ""}
                      </span>
                    </span>
                    {a.source === "bot" && (
                      <Badge className="hidden border-ai/25 bg-ai-soft text-ai sm:inline-flex">
                        <Bot aria-hidden />
                        Bot chốt
                      </Badge>
                    )}
                    <Badge variant={status.variant} className="shrink-0">
                      {status.label}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

const plainNumber = (n: number) => n.toLocaleString("vi-VN");

/** Một ô số liệu hôm nay: ô biểu tượng màu, số chạy từ 0, dòng giải thích. */
function Kpi({
  icon,
  tone,
  label,
  value,
  format = plainNumber,
  hint,
  title,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number;
  format?: (n: number) => string;
  hint: string;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/25 p-3 transition-colors hover:bg-muted/50 sm:p-4">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <IconTile icon={icon} tone={tone} size="sm" className="size-7 rounded-lg [&_svg]:size-3.5" />
        {label}
      </dt>
      <dd className="text-2xl font-bold tracking-tight" title={title}>
        <AnimatedNumber value={value} format={format} />
      </dd>
      <dd className="text-xs leading-snug text-muted-foreground">{hint}</dd>
    </div>
  );
}
