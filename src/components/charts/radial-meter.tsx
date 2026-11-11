"use client";

import { motion } from "motion/react";
import { easeOut } from "@/lib/motion";

const toneColor = { primary: "var(--primary)", ai: "var(--ai)", success: "var(--success)", warning: "var(--warning)" } as const;

/**
 * Vòng tiến độ cho MỘT tỷ lệ % (bot tự xử lý, lấp đầy lịch, giữ chân khách). Số % luôn hiện ở giữa bằng chữ,
 * không chỉ dựa vào độ dài vòng. `role="meter"` để trình đọc màn hình đọc đúng giá trị.
 */
export function RadialMeter({
  value,
  label,
  tone = "primary",
  size = 112,
  caption,
}: {
  /** 0–100; null = chưa có dữ liệu (hiện "—"). */
  value: number | null;
  label: string;
  tone?: keyof typeof toneColor;
  size?: number;
  caption?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.min(100, Math.max(0, value));
  const text = value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? "Chưa có dữ liệu" : text}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneColor[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - v / 100) }}
          transition={{ duration: 1, ease: easeOut }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-xl leading-none font-bold tracking-tight tabular-nums">{text}</span>
        {caption && <span className="mt-1 text-[11px] text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}
