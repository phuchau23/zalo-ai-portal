"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/lib/api/client";
import { formatTime, formatTimeRange, isTerminal, serviceNames, statusBlockClass, statusLabel } from "@/lib/appointments";
import { cn } from "@/lib/utils";
import { statusAccent } from "./tones";

/**
 * Thẻ lịch hẹn gọn (tuần, hồ sơ khách). Vạch trái theo màu riêng của nhân viên (`staffColor`, dữ liệu BE lưu, không phải
 * màu giao diện); không có thì theo trạng thái. Nổi nhẹ khi rê chuột.
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
        "relative flex min-h-11 w-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-xl py-2 pr-2 pl-3.5 text-left text-xs shadow-card ring-1 ring-foreground/[0.06] lift",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        statusBlockClass(a.status),
      )}
    >
      <span
        className={cn("absolute inset-y-1.5 left-1.5 w-1 rounded-full", !staffColor && statusAccent(a.status))}
        // Màu riêng của nhân viên do BE lưu (#rrggbb) để nhận ra trên lịch; không phải token giao diện.
        style={staffColor ? { backgroundColor: staffColor } : undefined}
        aria-hidden
      />
      <span className="flex items-center gap-1.5">
        <span className="tabular font-semibold">
          {showDate && <span className="font-normal text-muted-foreground">{showDate} </span>}
          {formatTime(a.startAt, timeZone)}
        </span>
        {a.source === "bot" && (
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-ai text-white" aria-label="Bot đặt">
            <Bot className="size-2.5" aria-hidden />
          </span>
        )}
        <Badge variant={status.variant} className="ml-auto h-4 px-1.5 text-[0.65rem] no-underline">
          {status.label}
        </Badge>
      </span>
      <span className={cn("truncate text-[13px] font-semibold", ended && a.status !== "done" && "text-muted-foreground")}>{a.contactName}</span>
      <span className="truncate text-muted-foreground">{serviceNames(a.items) || "—"}</span>
      {showStaff && <span className="truncate text-muted-foreground">{a.staffName ?? "Chưa xếp"}</span>}
    </button>
  );
}
