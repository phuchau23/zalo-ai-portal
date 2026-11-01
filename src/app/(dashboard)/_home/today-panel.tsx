"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Bot, CalendarCheck2, CalendarDays, CalendarPlus, ReceiptText, UserPlus, Wallet, type LucideIcon } from "lucide-react";
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
    <section aria-labelledby="today" className="surface flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="today" className="text-base font-semibold">
            Hôm nay
          </h2>
          <p className="text-sm text-muted-foreground">Số liệu tính từ 0 giờ, mọi chi nhánh.</p>
        </div>
        <Link href="/appointments" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 shrink-0 sm:h-8")}>
          Mở lịch hẹn
          <ArrowRight aria-hidden />
        </Link>
      </div>

      {today && (
        <dl className="grid grid-cols-2 border-b lg:grid-cols-4">
          <Kpi
            icon={Wallet}
            label="Doanh thu"
            value={compactVnd(today.revenue)}
            title={formatMoney(today.revenue)}
            hint={today.revenue > 0 ? `Tiền mặt ${compactVnd(today.cash)} · CK ${compactVnd(today.transfer)}` : "Chưa có khoản thu"}
          />
          <Kpi
            icon={CalendarDays}
            label="Lịch hẹn"
            value={today.appointments.toLocaleString("vi-VN")}
            hint={`Xong ${today.done} · Sắp tới ${today.upcoming}${today.noShows ? ` · Không đến ${today.noShows}` : ""}`}
          />
          <Kpi icon={UserPlus} label="Khách mới" value={today.newCustomers.toLocaleString("vi-VN")} hint={today.botBooked ? `Bot chốt ${today.botBooked} lịch hôm nay` : "Khách nhắn hoặc đặt lịch lần đầu"} />
          <Kpi
            icon={ReceiptText}
            label="Hóa đơn"
            value={today.invoices.toLocaleString("vi-VN")}
            hint={today.openInvoices ? `${today.openInvoices} hóa đơn còn nợ` : "Không có hóa đơn còn nợ"}
          />
        </dl>
      )}

      <div className="flex flex-col gap-3 px-5 py-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarCheck2 className="size-4 text-muted-foreground" aria-hidden />
          Lịch sắp tới
        </h3>
        {!appointments.data ? (
          <div role="status" aria-label="Đang tải lịch hẹn hôm nay" className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Không còn lịch hẹn nào trong hôm nay.</p>
            <Link href="/appointments?new=1" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 sm:h-8")}>
              <CalendarPlus aria-hidden />
              Đặt lịch hẹn
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {upcoming.map((a) => {
              const status = statusLabel(a.status);
              return (
                <li key={a.id}>
                  <Link
                    href={`/appointments?date=${day}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="tabular flex w-14 shrink-0 flex-col text-sm leading-tight font-semibold">
                      {formatTime(a.startAt, defaultTimeZone)}
                      <span className="text-xs font-normal text-muted-foreground">{formatTime(a.endAt, defaultTimeZone)}</span>
                    </span>
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

function Kpi({ icon: Icon, label, value, hint, title }: { icon: LucideIcon; label: string; value: string; hint: string; title?: string }) {
  return (
    <div className="-mb-px flex flex-col gap-1 border-b p-4 odd:border-r lg:border-r lg:last:border-r-0 lg:even:border-r">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="tabular text-2xl font-semibold tracking-tight" title={title}>
        {value}
      </dd>
      <dd className="text-xs leading-snug text-muted-foreground">{hint}</dd>
    </div>
  );
}
