"use client";

import { useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { tickIndexes } from "@/lib/reports";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ColumnDatum = { key: string; label: string; longLabel: string; value: number; note?: string };

/**
 * Biểu đồ cột cho tỷ lệ theo ngày (% lấp đầy lịch). Cột đạt ngưỡng `target` tô đậm, thấp hơn tô nhạt, kèm vạch ngưỡng
 * có chữ. Dòng đọc số phía trên hiện cột đang rê/focus; bàn phím: ← → Home End. Có bảng số liệu ẩn cho trình đọc màn hình.
 */
export function ColumnChart({
  data,
  max = 100,
  target,
  targetLabel,
  format,
  valueLabel,
  summary,
  height = 200,
}: {
  data: ColumnDatum[];
  max?: number;
  target?: number;
  targetLabel?: string;
  format: (value: number) => string;
  valueLabel: string;
  summary: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const n = data.length;
  const labels = new Set(tickIndexes(n, 8));
  const current = active === null ? null : data[active];

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    const i = active ?? n - 1;
    const next = e.key === "ArrowRight" ? Math.min(n - 1, i + 1) : e.key === "ArrowLeft" ? Math.max(0, i - 1) : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="min-h-5 text-sm text-muted-foreground" aria-hidden>
        {current ? (
          <>
            <span className="font-medium text-foreground">{current.longLabel}</span> · {format(current.value)}
            {current.note ? ` · ${current.note}` : ""}
          </>
        ) : (
          "Rê chuột hoặc chạm vào một cột để xem số."
        )}
      </p>
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="biểu đồ"
        aria-label={`${summary} Dùng phím mũi tên trái phải để xem từng ngày.`}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? (n > 0 ? n - 1 : null))}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        className="relative rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative flex items-end gap-[3px] border-b border-border" style={{ height }} aria-hidden>
          {target !== undefined && (
            <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-warning/70" style={{ bottom: `${(target / max) * 100}%` }}>
              {targetLabel && <span className="absolute -top-5 right-0 rounded bg-card px-1 text-[11px] font-medium text-warning">{targetLabel}</span>}
            </div>
          )}
          {data.map((d, i) => {
            const h = Math.max(1.5, (Math.min(d.value, max) / max) * 100);
            const reached = target === undefined || d.value >= target;
            return (
              <div key={d.key} className="flex h-full min-w-0 flex-1 cursor-default items-end" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
                <motion.div
                  className={cn(
                    "w-full origin-bottom rounded-t-[5px] transition-colors",
                    reached ? "bg-primary" : "bg-primary/30",
                    active === i && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    active !== null && active !== i && "opacity-60",
                  )}
                  style={{ height: `${h}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: Math.min(i, 30) * 0.015, ease: easeOut }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] pt-1.5" aria-hidden>
          {data.map((d, i) => (
            <span key={d.key} className="min-w-0 flex-1 text-center text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
              {labels.has(i) ? d.label : ""}
            </span>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {current ? `${current.longLabel}: ${valueLabel} ${format(current.value)}` : ""}
      </p>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.longLabel}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
