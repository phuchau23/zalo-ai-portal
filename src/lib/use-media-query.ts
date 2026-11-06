"use client";

import { useSyncExternalStore } from "react";

/**
 * Màn hình có khớp truy vấn CSS không (ví dụ "(min-width: 1280px)"), cập nhật khi đổi cỡ cửa sổ.
 * Trên máy chủ trả `false` (chưa biết cỡ màn hình).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
