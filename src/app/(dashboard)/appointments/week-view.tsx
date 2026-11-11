"use client";

import { CalendarPlus } from "lucide-react";
import type { Appointment, StaffMember } from "@/lib/api/client";
import { formatDayShort } from "@/lib/appointments";
import { cn } from "@/lib/utils";
import { AppointmentCard } from "./appointment-card";

/**
 * Lịch tuần: 7 cột T2 → CN, mỗi cột một thẻ trắng liệt kê lịch trong ngày theo giờ. Bấm tiêu đề ngày → mở lịch ngày đó.
 * Hôm nay: tiêu đề nền dải màu.
 */
export function WeekView({
  days,
  byDay,
  staff,
  timeZone,
  today,
  onSelect,
  onPickDay,
}: {
  days: string[];
  byDay: Record<string, Appointment[]>;
  staff: StaffMember[];
  timeZone: string;
  today: string;
  onSelect: (id: string) => void;
  onPickDay: (date: string) => void;
}) {
  const colorOf = (staffId: string | null) => (staffId ? (staff.find((s) => s.id === staffId)?.color ?? null) : null);
  return (
    <div className="grid gap-3 md:grid-cols-7 md:gap-2">
      {days.map((d) => {
        const list = byDay[d] ?? [];
        const isToday = d === today;
        const [weekday, dayMonth] = formatDayShort(d).split(" ");
        return (
          <section
            key={d}
            aria-label={formatDayShort(d)}
            className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card", isToday && "border-primary/40 ring-2 ring-primary/15")}
          >
            <button
              type="button"
              onClick={() => onPickDay(d)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset md:flex-col md:items-start md:gap-0.5",
                isToday ? "bg-active-gradient text-white" : "border-b bg-muted/40 hover:bg-muted",
              )}
            >
              <span className="flex items-baseline gap-1.5">
                <span className={cn("text-xs font-semibold tracking-wide uppercase", isToday ? "text-white/85" : "text-muted-foreground")}>{weekday}</span>
                <span className="tabular text-lg leading-none font-bold">{dayMonth}</span>
              </span>
              <span className={cn("tabular text-[11px]", isToday ? "text-white/85" : "text-muted-foreground")}>
                {list.length > 0 ? `${list.length} lịch` : isToday ? "Hôm nay" : "Trống"}
              </span>
            </button>
            {list.length > 0 ? (
              <ul className="flex flex-col gap-1.5 p-1.5">
                {list.map((a) => (
                  <li key={a.id}>
                    <AppointmentCard appointment={a} timeZone={timeZone} staffColor={colorOf(a.staffMemberId)} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hidden flex-1 items-center justify-center p-4 text-muted-foreground/50 md:flex" aria-hidden>
                <CalendarPlus className="size-5" />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
