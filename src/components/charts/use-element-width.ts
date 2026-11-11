"use client";

import { useEffect, useRef, useState } from "react";

/** Bề ngang thật của một khung (theo dõi bằng ResizeObserver) để SVG vẽ đúng pixel, không bị kéo giãn chữ. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
