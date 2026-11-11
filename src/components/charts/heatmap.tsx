"use client";

import { useMemo, useState } from "react";
import { heatLevel, heatmapGrid, weekdayLong, weekdayShort } from "@/lib/reports";
import { cn } from "@/lib/utils";

const levelClass = [
  "bg-muted/70",
  "bg-primary/15",
  "bg-primary/35",
  "bg-primary/60",
  "bg-primary",
] as const;

/**
 * Bản đồ nhiệt "giờ nào đông khách": hàng = thứ (T2 → CN), cột = giờ, ô càng đậm càng nhiều lịch hẹn.
 * Rê chuột một ô → dòng đọc số ngay trên lưới (không che ô). Lưới chỉ để nhìn (aria-hidden); trình đọc màn hình đọc bảng
 * số liệu ẩn + câu tóm tắt giờ cao điểm. Điện thoại: lưới cuộn ngang trong khung riêng, nhãn thứ đứng yên.
 */
export function Heatmap({ cells, label }: { cells: { day: number; hour: number; appointments: number }[]; label: string }) {
  const grid = useMemo(() => heatmapGrid(cells), [cells]);
  const [hover, setHover] = useState<{ day: number; hour: number; value: number } | null>(null);

  const peak = useMemo(() => {
    let best: { day: number; hour: number; value: number } | null = null;
    for (const row of grid.rows) row.values.forEach((v, i) => {
      if (v > 0 && (!best || v > best.value)) best = { day: row.day, hour: grid.hours[i], value: v };
    });
    return best as { day: number; hour: number; value: number } | null;
  }, [grid]);

  const readout = hover ?? peak;

  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-5 text-sm text-muted-foreground" aria-hidden>
        {readout ? (
          <>
            <span className="font-medium text-foreground">
              {weekdayLong[readout.day]}, {readout.hour}:00 – {readout.hour + 1}:00
            </span>
            {" · "}
            {readout.value} lịch hẹn{!hover && " (đông nhất)"}
          </>
        ) : (
          "Chưa có lịch hẹn trong khoảng này."
        )}
      </p>

      <div className="flex gap-2" aria-hidden onPointerLeave={() => setHover(null)}>
        <div className="flex shrink-0 flex-col gap-1 pt-6">
          {grid.rows.map((row) => (
            <span key={row.day} className="flex h-7 items-center text-xs font-medium text-muted-foreground">
              {weekdayShort[row.day]}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pb-1 scrollbar-thin">
          <div className="grid min-w-max gap-1" style={{ gridTemplateColumns: `repeat(${grid.hours.length}, minmax(1.75rem, 1fr))` }}>
            {grid.hours.map((h) => (
              <span key={h} className="flex h-5 items-end justify-center text-[11px] text-muted-foreground tabular-nums">
                {h % 2 === 0 ? `${h}h` : ""}
              </span>
            ))}
            {grid.rows.map((row) =>
              row.values.map((v, i) => {
                const level = heatLevel(v, grid.max);
                const isHover = hover?.day === row.day && hover.hour === grid.hours[i];
                return (
                  <span
                    key={`${row.day}-${grid.hours[i]}`}
                    onPointerEnter={() => setHover({ day: row.day, hour: grid.hours[i], value: v })}
                    className={cn(
                      "h-7 rounded-md transition-[box-shadow,transform] duration-150",
                      levelClass[level],
                      isHover && "z-10 scale-110 shadow-card-hover ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground" aria-hidden>
        Ít
        {levelClass.map((cls, i) => (
          <span key={i} className={cn("size-3 rounded-[4px]", cls)} />
        ))}
        Nhiều
      </div>

      <table className="sr-only">
        <caption>
          {label}. {peak ? `Đông nhất: ${weekdayLong[peak.day]} ${peak.hour} giờ, ${peak.value} lịch hẹn.` : "Chưa có lịch hẹn."}
        </caption>
        <thead>
          <tr>
            <th scope="col">Thứ</th>
            {grid.hours.map((h) => (
              <th key={h} scope="col">
                {h} giờ
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.day}>
              <th scope="row">{weekdayLong[row.day]}</th>
              {row.values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
