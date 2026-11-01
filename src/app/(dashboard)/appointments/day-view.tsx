"use client";

import { useMemo } from "react";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Appointment, StaffMember } from "@/lib/api/client";
import {
  formatTime,
  gridSlots,
  layoutBlocks,
  minutesToHHmm,
  serviceNames,
  statusBlockClass,
  statusLabel,
  type GridRange,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__unassigned__";

type Column = { id: string; name: string; color: string | null };

/**
 * Lịch ngày: mỗi cột một nhân viên nhận lịch (+ cột "Chưa xếp"), hàng là các bước giờ của chi nhánh.
 * Bấm ô trống → đặt lịch sẵn nhân viên + giờ; bấm khối → xem chi tiết.
 */
export function DayView({
  appointments,
  staff,
  range,
  slotMinutes,
  timeZone,
  nowMinutes,
  onSelect,
  onCreateAt,
}: {
  appointments: Appointment[];
  /** Nhân viên nhận lịch của chi nhánh (đã lọc). */
  staff: StaffMember[];
  range: GridRange;
  slotMinutes: number;
  timeZone: string;
  /** Phút kể từ 0h nếu đang xem hôm nay (để kẻ vạch giờ hiện tại); null = ngày khác. */
  nowMinutes: number | null;
  onSelect: (id: string) => void;
  onCreateAt: (staffMemberId: string | null, time: string) => void;
}) {
  const slots = useMemo(() => gridSlots(range, slotMinutes), [range, slotMinutes]);
  const slotPx = slotMinutes >= 60 ? 64 : slotMinutes >= 30 ? 44 : 28;
  const totalPx = slots.length * slotPx;
  const total = range.endMinutes - range.startMinutes;

  const columns = useMemo<Column[]>(() => {
    const staffIds = new Set(staff.map((s) => s.id));
    const cols: Column[] = staff.map((s) => ({ id: s.id, name: s.displayName, color: s.color }));
    const hasUnassigned = appointments.some((a) => !a.staffMemberId || !staffIds.has(a.staffMemberId));
    if (hasUnassigned || cols.length === 0) cols.push({ id: UNASSIGNED, name: "Chưa xếp", color: null });
    return cols;
  }, [staff, appointments]);

  const byColumn = useMemo(() => {
    const staffIds = new Set(staff.map((s) => s.id));
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = a.staffMemberId && staffIds.has(a.staffMemberId) ? a.staffMemberId : UNASSIGNED;
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [appointments, staff]);

  const nowTop = nowMinutes !== null && nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes ? ((nowMinutes - range.startMinutes) / total) * 100 : null;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="grid" style={{ gridTemplateColumns: `3.25rem repeat(${columns.length}, minmax(11rem, 1fr))` }}>
        {/* Hàng tiêu đề */}
        <div className="sticky left-0 z-20 border-b bg-background" />
        {columns.map((c) => (
          <div key={c.id} className="flex min-h-11 items-center gap-2 border-b border-l px-2 py-2 text-sm font-medium">
            {c.color ? (
              // Màu riêng của nhân viên do BE lưu (#rrggbb); không phải màu giao diện.
              <span className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: c.color }} aria-hidden />
            ) : (
              <span className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground" aria-hidden />
            )}
            <span className="truncate">{c.name}</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground tabular">{byColumn.get(c.id)?.length ?? 0}</span>
          </div>
        ))}

        {/* Cột giờ */}
        <div className="sticky left-0 z-20 bg-background" style={{ height: totalPx }}>
          <div className="relative h-full">
            {slots.map((m, i) =>
              m % 60 === 0 ? (
                <span key={m} className="absolute right-1.5 -translate-y-1/2 text-xs text-muted-foreground tabular" style={{ top: i * slotPx }}>
                  {minutesToHHmm(m)}
                </span>
              ) : null,
            )}
            {nowTop !== null && (
              <span className="absolute right-1 -translate-y-1/2 rounded-sm bg-destructive px-1 text-[0.65rem] font-medium text-white tabular" style={{ top: `${nowTop}%` }}>
                {minutesToHHmm(nowMinutes ?? 0)}
              </span>
            )}
          </div>
        </div>

        {/* Các cột nhân viên */}
        {columns.map((c) => {
          const list = byColumn.get(c.id) ?? [];
          const blocks = layoutBlocks(list, range, timeZone);
          const staffId = c.id === UNASSIGNED ? null : c.id;
          return (
            <div key={c.id} className="relative border-l" style={{ height: totalPx }}>
              {slots.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`Đặt lịch ${minutesToHHmm(m)} ${c.name}`}
                  onClick={() => onCreateAt(staffId, minutesToHHmm(m))}
                  className={cn(
                    "absolute inset-x-0 block w-full border-t hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset focus-visible:outline-none",
                    m % 60 === 0 ? "border-border" : "border-border/40",
                  )}
                  style={{ top: i * slotPx, height: slotPx }}
                />
              ))}
              {nowTop !== null && <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-destructive" style={{ top: `${nowTop}%` }} aria-hidden />}
              {blocks.map((b) => {
                const a = list.find((x) => x.id === b.id);
                if (!a) return null;
                const status = statusLabel(a.status);
                const color = c.color ?? staff.find((s) => s.id === a.staffMemberId)?.color ?? null;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a.id)}
                    aria-label={`${formatTime(a.startAt, timeZone)} ${a.contactName}, ${serviceNames(a.items)}, ${status.label}`}
                    className={cn(
                      "absolute inset-x-1 z-10 flex flex-col gap-0.5 overflow-hidden rounded-md border border-l-4 px-1.5 py-0.5 text-left text-xs shadow-xs transition-[filter] hover:brightness-95",
                      "focus-visible:z-20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      statusBlockClass(a.status),
                    )}
                    // Màu riêng của nhân viên do BE lưu (#rrggbb); không phải màu giao diện.
                    style={{ top: `${b.top}%`, height: `${b.height}%`, borderLeftColor: color ?? undefined }}
                  >
                    <span className="flex items-center gap-1">
                      <span className="tabular font-medium">{formatTime(a.startAt, timeZone)}</span>
                      {a.source === "bot" && <Bot className="size-3 shrink-0 text-muted-foreground" aria-label="Bot đặt" />}
                      <Badge variant={status.variant} className="ml-auto h-4 px-1 text-[0.6rem] no-underline">
                        {status.label}
                      </Badge>
                    </span>
                    <span className="truncate font-medium">{a.contactName}</span>
                    <span className="truncate text-muted-foreground">{serviceNames(a.items)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
