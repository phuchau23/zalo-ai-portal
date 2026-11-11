"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { shares } from "@/lib/reports";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { arcPath, seriesColors } from "./geometry";

export type DonutSlice = { key: string; label: string; value: number };

/**
 * Biểu đồ vành khuyên cho TỶ LỆ của ít nhóm (cách thanh toán, nguồn khách). Hơn 5 nhóm → gộp phần đuôi thành "Khác"
 * (vành khuyên nhiều lát khó đọc — quy tắc no-pie-overuse). Chú thích bên cạnh ghi số tiền + %, rê/chạm/focus một dòng
 * thì lát tương ứng nổi lên và giữa vòng hiện số của lát đó.
 */
export function DonutChart({
  slices,
  format,
  totalLabel,
  label,
  size = 168,
}: {
  slices: DonutSlice[];
  format: (value: number) => string;
  totalLabel: string;
  label: string;
  size?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const groups = sorted.length > 5 ? [...sorted.slice(0, 4), { key: "__other", label: "Khác", value: sorted.slice(4).reduce((s, x) => s + x.value, 0) }] : sorted;
  const total = groups.reduce((s, g) => s + g.value, 0);
  const pct = shares(groups.map((g) => g.value));

  const stroke = 18;
  const r = (size - stroke) / 2 - 4;
  const c = size / 2;
  const gap = groups.length > 1 ? 0.035 : 0;
  const sweeps = groups.map((g) => (total === 0 ? 0 : (g.value / total) * Math.PI * 2));
  const arcs = groups.map((g, i) => {
    const offset = sweeps.slice(0, i).reduce((s, v) => s + v, 0);
    const start = offset + gap / 2;
    const end = offset + sweeps[i] - gap / 2;
    return { ...g, i, start, end: Math.max(start + 0.0001, end) };
  });

  const focus = active === null ? null : groups[active];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden className="block">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          {arcs.map((a) => (
            <motion.path
              key={a.key}
              d={arcPath(c, c, r, a.start, a.end)}
              fill="none"
              stroke={seriesColors[a.i % seriesColors.length]}
              strokeWidth={active === a.i ? stroke + 5 : stroke}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: active === null || active === a.i ? 1 : 0.35 }}
              transition={{ duration: 0.7, delay: a.i * 0.08, ease: easeOut }}
              onPointerEnter={() => setActive(a.i)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-[11px] font-medium text-muted-foreground">{focus ? focus.label : totalLabel}</span>
          <span className="text-lg leading-tight font-bold tracking-tight tabular-nums">{format(focus ? focus.value : total)}</span>
          {focus && <span className="text-xs text-muted-foreground tabular-nums">{pct[active!].toLocaleString("vi-VN")}%</span>}
        </div>
      </div>

      <ul aria-label={label} className="flex w-full min-w-0 flex-col gap-1">
        {groups.map((g, i) => (
          <li key={g.key}>
            <button
              type="button"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex min-h-10 w-full cursor-default items-center gap-2.5 rounded-lg px-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === i ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: seriesColors[i % seriesColors.length] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              <span className="font-semibold tabular-nums">{format(g.value)}</span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{pct[i].toLocaleString("vi-VN")}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
