"use client";

import { Bot } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Appointment } from "@/lib/api/client";
import { dateKeyOf, formatDayShort, formatTimeRange, isTerminal, serviceNames, sourceLabel, statusLabel } from "@/lib/appointments";
import { cn } from "@/lib/utils";

/** Danh sách lịch hẹn dạng bảng, sắp theo giờ bắt đầu. Khách và nhân viên có ảnh đại diện chữ cái. */
export function ListView({ appointments, timeZone, onSelect }: { appointments: Appointment[]; timeZone: string; onSelect: (id: string) => void }) {
  const sorted = [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Giờ</TableHead>
            <TableHead>Khách</TableHead>
            <TableHead>Dịch vụ</TableHead>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Nguồn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((a) => {
            const status = statusLabel(a.status);
            const muted = isTerminal(a.status) && a.status !== "done";
            return (
              <TableRow key={a.id} onClick={() => onSelect(a.id)} className={cn("cursor-pointer", muted && "text-muted-foreground")}>
                <TableCell className="whitespace-nowrap tabular">
                  <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{formatDayShort(dateKeyOf(a.startAt, timeZone))}</span>
                  <span className="font-semibold">{formatTimeRange(a.startAt, a.endAt, timeZone)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar name={a.contactName} size="sm" />
                    <div className="flex min-w-0 flex-col">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(a.id);
                        }}
                        className={cn(
                          "min-h-6 cursor-pointer rounded-sm text-left font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11",
                          muted && "line-through",
                        )}
                      >
                        {a.contactName}
                      </button>
                      {a.contactPhone && <span className="text-xs text-muted-foreground tabular">{a.contactPhone}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-56 truncate">{serviceNames(a.items) || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {a.staffName ? (
                    <span className="inline-flex items-center gap-2">
                      <PersonAvatar name={a.staffName} size="xs" />
                      {a.staffName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Chưa xếp</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={cn("inline-flex items-center gap-1.5", a.source === "bot" && "font-medium text-ai")}>
                    {a.source === "bot" && (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-ai-soft" aria-hidden>
                        <Bot className="size-3" />
                      </span>
                    )}
                    {sourceLabel(a.source)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
