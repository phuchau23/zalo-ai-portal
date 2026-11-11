"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { niceScale, tickIndexes } from "@/lib/reports";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { areaPath, monotonePath } from "./geometry";
import { useElementWidth } from "./use-element-width";

export type TrendDatum = {
  key: string;
  /** Nhãn ngắn trên trục ngang ("03/11"). */
  label: string;
  /** Nhãn đầy đủ trong chú thích ("Thứ ba, 03/11/2026"). */
  longLabel: string;
  value: number;
  /** Dòng phụ trong chú thích, ví dụ "4 hóa đơn". */
  note?: string;
};

const toneColor = { primary: "var(--primary)", ai: "var(--ai)", success: "var(--success)", brand: "var(--foreground)" } as const;

/**
 * Biểu đồ đường + vùng tô cho số liệu theo thời gian (doanh thu theo ngày/tuần/tháng).
 * - Rê chuột / chạm: vạch dọc + chú thích số chính xác. Bàn phím: Tab vào biểu đồ, ← → Home End để đi qua từng điểm.
 * - Trình đọc màn hình: tóm tắt ở aria-label, giá trị đang chọn đọc qua vùng aria-live, kèm bảng số liệu ẩn.
 * - Vẽ theo bề ngang thật của khung (không co giãn chữ), đường cong không vọt dưới 0.
 */
export function TrendChart({
  data,
  valueLabel,
  formatAxis,
  formatValue,
  summary,
  tone = "primary",
  height = 260,
  className,
}: {
  data: TrendDatum[];
  valueLabel: string;
  formatAxis: (value: number) => string;
  formatValue: (value: number) => string;
  /** Một câu tóm tắt ý chính cho trình đọc màn hình. */
  summary: string;
  tone?: keyof typeof toneColor;
  height?: number;
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const color = toneColor[tone];
  // "brand": đường mực, vùng tô xanh chanh (chữ ký Remi); tông khác: vùng cùng màu đường.
  const fill = tone === "brand" ? "var(--lime)" : color;
  const fillTop = tone === "brand" ? 0.75 : 0.24;

  const scale = useMemo(() => niceScale(Math.max(0, ...data.map((d) => d.value))), [data]);
  const axisWidth = Math.max(36, Math.max(...scale.ticks.map((t) => formatAxis(t).length)) * 7 + 14);
  const margin = { top: 14, right: 14, bottom: 30, left: axisWidth };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const n = data.length;

  const x = (i: number) => margin.left + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => margin.top + innerH - (v / scale.top) * innerH;
  const points = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const baseY = margin.top + innerH;
  const labels = tickIndexes(n, Math.max(2, Math.floor(innerW / 68)));
  const drawKey = `${data[0]?.key ?? ""}-${data.at(-1)?.key ?? ""}-${n}`;

  function pick(clientX: number, target: Element) {
    if (n === 0) return;
    const rect = target.getBoundingClientRect();
    const px = clientX - rect.left - margin.left;
    const i = n <= 1 ? 0 : Math.round((px / Math.max(1, innerW)) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    const current = active ?? n - 1;
    const next =
      e.key === "ArrowRight" ? Math.min(n - 1, current + 1)
      : e.key === "ArrowLeft" ? Math.max(0, current - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (e.key === "Escape") setActive(null);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  }

  const activeDatum = active === null ? null : data[active];
  const activeX = active === null ? 0 : x(active);
  const side = activeX > width * 0.68 ? "left" : activeX < width * 0.32 ? "right" : "center";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-roledescription="biểu đồ"
        aria-label={`${summary} Dùng phím mũi tên trái phải để xem từng điểm.`}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? (n > 0 ? n - 1 : null))}
        onBlur={() => setActive(null)}
        className="relative rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ height }}
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="block touch-pan-y select-none"
            onPointerMove={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget)}
            onPointerDown={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={fill} stopOpacity={fillTop} />
                <stop offset="70%" stopColor={fill} stopOpacity={fillTop / 4} />
                <stop offset="100%" stopColor={fill} stopOpacity={0} />
              </linearGradient>
            </defs>

            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={margin.left} x2={width - margin.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={margin.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                  {formatAxis(t)}
                </text>
              </g>
            ))}

            {labels.map((i) => (
              <text
                key={data[i].key}
                x={x(i)}
                y={height - 8}
                textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"}
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {data[i].label}
              </text>
            ))}

            <motion.path
              key={`area-${drawKey}`}
              d={areaPath(points, baseY)}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25, ease: easeOut }}
            />
            <motion.path
              key={`line-${drawKey}`}
              d={monotonePath(points)}
              fill="none"
              stroke={color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: easeOut }}
            />

            {n > 0 && active === null && (
              <circle cx={points[n - 1].x} cy={points[n - 1].y} r={3.5} fill="var(--card)" stroke={color} strokeWidth={2} />
            )}

            {activeDatum && active !== null && (
              <g>
                <line x1={activeX} x2={activeX} y1={margin.top} y2={baseY} stroke={color} strokeOpacity={0.35} strokeDasharray="3 3" />
                <circle cx={activeX} cy={points[active].y} r={9} fill={color} fillOpacity={0.14} />
                <circle cx={activeX} cy={points[active].y} r={4.5} fill="var(--card)" stroke={color} strokeWidth={2.5} />
              </g>
            )}
          </svg>
        )}

        {activeDatum && (
          <div
            className={cn(
              "pointer-events-none absolute top-1 z-10 min-w-36 rounded-xl border bg-popover/95 px-3 py-2 text-popover-foreground shadow-card-hover backdrop-blur",
              side === "center" && "-translate-x-1/2",
              side === "left" && "-translate-x-[calc(100%+12px)]",
              side === "right" && "translate-x-3",
            )}
            style={{ left: activeX }}
          >
            <p className="text-[11px] font-medium text-muted-foreground">{activeDatum.longLabel}</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
              <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
              {formatValue(activeDatum.value)}
            </p>
            {activeDatum.note && <p className="text-xs text-muted-foreground tabular-nums">{activeDatum.note}</p>}
          </div>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {activeDatum ? `${activeDatum.longLabel}: ${valueLabel} ${formatValue(activeDatum.value)}${activeDatum.note ? `, ${activeDatum.note}` : ""}` : ""}
      </p>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Thời gian</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.longLabel}</th>
              <td>
                {formatValue(d.value)}
                {d.note ? ` (${d.note})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
