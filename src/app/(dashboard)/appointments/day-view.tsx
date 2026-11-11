"use client";

import { useMemo } from "react";
import { Bot, Plus } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
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
import { statusAccent } from "./tones";

const UNASSIGNED = "__unassigned__";

type Column = { id: string; name: string; color: string | null };

/**
 * Lịch ngày: mỗi cột một nhân viên nhận lịch (+ cột "Chưa xếp"), hàng là các bước giờ của chi nhánh.
 * Bấm ô trống → đặt lịch sẵn nhân viên + giờ; bấm khối → xem chi tiết.
 * Giao diện: thẻ trắng bo góc, tiêu đề cột có ảnh đại diện nhân viên, kẻ giờ đậm / nửa giờ nét đứt,
 * khối lịch là thẻ nhỏ có vạch màu bên trái, vạch đỏ "bây giờ" khi xem hôm nay.
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
  const slotPx = slotMinutes >= 60 ? 68 : slotMinutes >= 30 ? 46 : 30;
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
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="scrollbar-thin overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `3.75rem repeat(${columns.length}, minmax(11.5rem, 1fr))` }}>
          {/* Hàng tiêu đề */}
          <div className="sticky left-0 z-20 border-b bg-muted/40 backdrop-blur" />
          {columns.map((c) => {
            const count = byColumn.get(c.id)?.length ?? 0;
            const unassigned = c.id === UNASSIGNED;
            return (
              <div key={c.id} className="flex min-h-14 items-center gap-2.5 border-b border-l bg-muted/40 px-3 py-2">
                {unassigned ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground" aria-hidden>
                    ?
                  </span>
                ) : (
                  <PersonAvatar
                    name={c.name}
                    size="sm"
                    badge={
                      c.color ? (
                        // Màu riêng của nhân viên do BE lưu (#rrggbb); không phải màu giao diện.
                        <span className="size-2.5 rounded-full ring-2 ring-card" style={{ backgroundColor: c.color }} />
                      ) : undefined
                    }
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">{unassigned ? "Chưa có người làm" : count > 0 ? `${count} lịch hôm nay` : "Còn trống"}</span>
                </span>
                {count > 0 && (
                  <span className="tabular inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                    {count}
                  </span>
                )}
              </div>
            );
          })}

          {/* Cột giờ */}
          <div className="sticky left-0 z-20 border-r bg-card/95 backdrop-blur" style={{ height: totalPx }}>
            <div className="relative h-full">
              {slots.map((m, i) =>
                m % 60 === 0 ? (
                  <span
                    key={m}
                    className={cn("absolute right-2 text-[11px] font-medium text-muted-foreground tabular", i === 0 ? "top-1" : "-translate-y-1/2")}
                    style={i === 0 ? undefined : { top: i * slotPx }}
                  >
                    {minutesToHHmm(m)}
                  </span>
                ) : null,
              )}
              {nowTop !== null && (
                <span
                  className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-destructive px-1.5 py-px text-[10px] font-semibold text-white tabular shadow-sm"
                  style={{ top: `${nowTop}%` }}
                >
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
                      "group/slot absolute inset-x-0 flex w-full cursor-pointer items-start justify-end border-t p-1 transition-colors hover:bg-primary/[0.05] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
                      i === 0 ? "border-transparent" : m % 60 === 0 ? "border-border/80" : "border-dashed border-border/50",
                    )}
                    style={{ top: i * slotPx, height: slotPx }}
                  >
                    <Plus className="size-3.5 text-primary opacity-0 transition-opacity group-hover/slot:opacity-70 group-focus-visible/slot:opacity-70" aria-hidden />
                  </button>
                ))}
                {nowTop !== null && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: `${nowTop}%` }} aria-hidden>
                    <span className="-ml-1 size-2 shrink-0 -translate-y-px rounded-full bg-destructive" />
                    <span className="h-0.5 flex-1 -translate-y-px bg-destructive/80" />
                  </div>
                )}
                {blocks.map((b) => {
                  const a = list.find((x) => x.id === b.id);
                  if (!a) return null;
                  const status = statusLabel(a.status);
                  const color = c.color ?? staff.find((s) => s.id === a.staffMemberId)?.color ?? null;
                  // Khối đủ cao (≥ ~1 giờ) mới hiện thêm dòng dịch vụ; tên dịch vụ luôn có trong aria-label.
                  const tall = (b.height / 100) * totalPx >= 60;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      aria-label={`${formatTime(a.startAt, timeZone)} ${a.contactName}, ${serviceNames(a.items)}, ${status.label}`}
                      className={cn(
                        "absolute inset-x-1.5 z-10 flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-lg py-1 pr-1.5 pl-3 text-left text-xs shadow-card ring-1 ring-foreground/[0.06] transition-[box-shadow,transform] duration-200 hover:z-20 hover:-translate-y-px hover:shadow-card-hover motion-reduce:hover:translate-y-0",
                        "animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none",
                        "focus-visible:z-20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        statusBlockClass(a.status),
                      )}
                      style={{ top: `calc(${b.top}% + 1px)`, height: `calc(${b.height}% - 2px)` }}
                    >
                      <span
                        className={cn("absolute inset-y-1 left-1 w-1 rounded-full", !color && statusAccent(a.status))}
                        // Màu riêng của nhân viên do BE lưu (#rrggbb); không phải màu giao diện.
                        style={color ? { backgroundColor: color } : undefined}
                        aria-hidden
                      />
                      <span className="flex items-center gap-1">
                        <span className="tabular font-semibold">{formatTime(a.startAt, timeZone)}</span>
                        {a.source === "bot" && (
                          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-ai text-white" aria-label="Bot đặt">
                            <Bot className="size-2.5" aria-hidden />
                          </span>
                        )}
                        <Badge variant={status.variant} className="ml-auto h-4 px-1.5 text-[0.6rem] no-underline">
                          {status.label}
                        </Badge>
                      </span>
                      <span className="truncate font-semibold">{a.contactName}</span>
                      {tall && <span className="truncate text-muted-foreground">{serviceNames(a.items)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
