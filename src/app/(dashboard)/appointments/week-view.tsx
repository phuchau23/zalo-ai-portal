"use client";

import type { Appointment, StaffMember } from "@/lib/api/client";
import { formatDayShort } from "@/lib/appointments";
import { cn } from "@/lib/utils";
import { AppointmentCard } from "./appointment-card";

/** Lịch tuần: 7 cột T2 → CN, mỗi cột liệt kê lịch trong ngày theo giờ. Bấm tiêu đề ngày → mở lịch ngày đó. */
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
        return (
          <section key={d} aria-label={formatDayShort(d)} className={cn("flex flex-col gap-1.5 rounded-md border p-1.5", isToday && "border-primary/50 bg-primary/5")}>
            <button
              type="button"
              onClick={() => onPickDay(d)}
              className="flex min-h-11 items-center justify-between rounded-sm px-1.5 text-sm font-medium hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-9"
            >
              <span className={cn(isToday && "text-primary")}>{formatDayShort(d)}</span>
              <span className="text-xs font-normal text-muted-foreground tabular">{list.length > 0 ? `${list.length} lịch` : "—"}</span>
            </button>
            {list.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {list.map((a) => (
                  <li key={a.id}>
                    <AppointmentCard appointment={a} timeZone={timeZone} staffColor={colorOf(a.staffMemberId)} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
