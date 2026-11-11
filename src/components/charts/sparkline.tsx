"use client";

import { useId } from "react";
import { areaPath, monotonePath } from "./geometry";

const toneColor = { primary: "var(--primary)", ai: "var(--ai)", success: "var(--success)", warning: "var(--warning)", ink: "var(--foreground)" } as const;

/** Đường xu hướng nhỏ trong thẻ số liệu — chỉ để nhìn dáng (aria-hidden); con số thật nằm ở chữ của thẻ. */
export function Sparkline({ values, tone = "primary", width = 96, height = 32 }: { values: number[]; tone?: keyof typeof toneColor; width?: number; height?: number }) {
  const id = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pad = 2;
  const points = values.map((v, i) => ({
    x: pad + (i * (width - pad * 2)) / (values.length - 1),
    y: pad + (height - pad * 2) * (1 - v / max),
  }));
  const color = toneColor[tone];
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath(points, height)} fill={`url(#${id})`} />
      <path d={monotonePath(points)} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.at(-1)!.x} cy={points.at(-1)!.y} r={2.5} fill={color} />
    </svg>
  );
}
