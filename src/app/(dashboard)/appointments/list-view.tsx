"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Appointment } from "@/lib/api/client";
import { dateKeyOf, formatDayShort, formatTimeRange, isTerminal, serviceNames, sourceLabel, statusLabel } from "@/lib/appointments";
import { cn } from "@/lib/utils";

/** Danh sách lịch hẹn dạng bảng, sắp theo giờ bắt đầu. */
export function ListView({ appointments, timeZone, onSelect }: { appointments: Appointment[]; timeZone: string; onSelect: (id: string) => void }) {
  const sorted = [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <div className="overflow-x-auto rounded-md border">
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
                  <span className="text-xs text-muted-foreground">{formatDayShort(dateKeyOf(a.startAt, timeZone))}</span>
                  <br />
                  {formatTimeRange(a.startAt, a.endAt, timeZone)}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(a.id);
                    }}
                    className={cn("min-h-11 text-left font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", muted && "line-through")}
                  >
                    {a.contactName}
                  </button>
                  {a.contactPhone && <div className="text-xs text-muted-foreground">{a.contactPhone}</div>}
                </TableCell>
                <TableCell className="max-w-56 truncate">{serviceNames(a.items) || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{a.staffName ?? <span className="text-muted-foreground">Chưa xếp</span>}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {a.source === "bot" && <Bot className="size-3.5 text-muted-foreground" aria-hidden />}
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
