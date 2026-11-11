"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const defaultFormat = (n: number) => n.toLocaleString("vi-VN");

/**
 * Số chạy từ giá trị cũ (lần đầu: 0) tới giá trị mới — cho thẻ thống kê (doanh thu, lịch hẹn...).
 * Trình đọc màn hình chỉ đọc giá trị cuối (phần chạy số ẩn khỏi cây truy cập). Tắt khi người dùng chọn giảm chuyển động.
 */
export function AnimatedNumber({ value, format = defaultFormat, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: easeOut,
      onUpdate: (v) => {
        el.textContent = format(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return (
    <span className={cn("tabular", className)}>
      <span ref={ref} aria-hidden>
        {format(0)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
