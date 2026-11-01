"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Cách dùng trang này": vài dòng hướng dẫn cho người mới, gập lại được.
 * Nhớ trạng thái mở/gập theo từng trang trên máy này (localStorage) để người đã quen không bị làm phiền.
 */
export function PageHelp({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const key = `page-help:${storageKey}`;

  useEffect(() => {
    try {
      // Đọc sau khi gắn lên trình duyệt (máy chủ không có localStorage), tránh lệch nội dung khi hydrate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(key) === "open") setOpen(true);
    } catch {
      // Trình duyệt chặn localStorage: mặc định gập.
    }
  }, [key]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(key, next ? "open" : "closed");
    } catch {
      // Không lưu được thì thôi, lần sau mặc định gập.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full border bg-card px-3 text-[13px] font-medium text-foreground/80 shadow-card transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
      >
        <Lightbulb className="size-4 text-warning" aria-hidden />
        Cách dùng trang này
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id={id}
        hidden={!open}
        className="max-w-3xl rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-foreground/85 [&_li]:pl-1 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5"
      >
        {children}
      </div>
    </div>
  );
}
