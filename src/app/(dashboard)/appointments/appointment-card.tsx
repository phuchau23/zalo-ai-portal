"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/lib/api/client";
import { formatTime, formatTimeRange, isTerminal, serviceNames, statusBlockClass, statusLabel } from "@/lib/appointments";
import { cn } from "@/lib/utils";

/**
 * Thẻ lịch hẹn gọn (tuần, hồ sơ khách). Viền trái theo màu riêng của nhân viên (`staffColor`, dữ liệu BE lưu, không phải màu giao diện).
 */
export function AppointmentCard({
  appointment: a,
  timeZone,
  staffColor,
  showStaff = true,
  showDate,
  onSelect,
}: {
  appointment: Appointment;
  timeZone: string;
  staffColor?: string | null;
  showStaff?: boolean;
  /** Chuỗi ngày hiện trước giờ (dùng khi danh sách gộp nhiều ngày). */
  showDate?: string;
  onSelect: (id: string) => void;
}) {
  const status = statusLabel(a.status);
  const ended = isTerminal(a.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(a.id)}
      aria-label={`${formatTimeRange(a.startAt, a.endAt, timeZone)} ${a.contactName}, ${status.label}`}
      className={cn(
        "flex w-full min-h-11 flex-col gap-0.5 rounded-md border border-l-4 px-2 py-1.5 text-left text-xs transition-colors hover:brightness-95",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        statusBlockClass(a.status),
      )}
      // Màu riêng của nhân viên do BE lưu (#rrggbb) để nhận ra trên lịch; không phải token giao diện.
      style={staffColor ? { borderLeftColor: staffColor } : undefined}
    >
      <span className="flex items-center gap-1.5">
        <span className="tabular font-medium">
          {showDate && <span className="text-muted-foreground">{showDate} </span>}
          {formatTime(a.startAt, timeZone)}
        </span>
        {a.source === "bot" && <Bot className="size-3.5 shrink-0 text-muted-foreground" aria-label="Bot đặt" />}
        <Badge variant={status.variant} className="ml-auto h-4 px-1.5 text-[0.65rem] no-underline">
          {status.label}
        </Badge>
      </span>
      <span className={cn("truncate font-medium", ended && a.status !== "done" && "text-muted-foreground")}>{a.contactName}</span>
      <span className="truncate text-muted-foreground">{serviceNames(a.items) || "—"}</span>
      {showStaff && <span className="truncate text-muted-foreground">{a.staffName ?? "Chưa xếp"}</span>}
    </button>
  );
}
