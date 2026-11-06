"use client";

import { CloudUpload, LoaderCircle } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Vùng kéo thả file của Kho kiến thức: nền lưới chấm + quầng tím, biểu tượng nổi lên khi rê/kéo file vào.
 * Dùng <label> bọc <input type=file> thật nên bàn phím và trình đọc màn hình dùng như ô chọn file bình thường.
 */
export function DropZone({
  accept,
  formats,
  hint,
  busy,
  busyLabel = "Đang tải lên...",
  onFile,
}: {
  /** Ví dụ ".xlsx,.json" */
  accept: string;
  /** Hiện cho người dùng, ví dụ "Excel (.xlsx) hoặc JSON" */
  formats: string;
  hint?: string;
  busy?: boolean;
  busyLabel?: string;
  onFile: (file: File) => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "group relative isolate flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-primary/25 bg-card px-6 py-10 text-center shadow-card transition-[border-color,background-color,box-shadow] duration-200",
        "hover:border-primary/50 hover:shadow-card-hover has-focus-visible:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        dragging && "border-primary bg-accent/60 shadow-glow",
        busy && "pointer-events-none opacity-75",
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 -z-10 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300",
          dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Cho phép chọn lại cùng một file sau khi sửa.
          e.target.value = "";
        }}
      />
      <span
        className={cn(
          "relative flex size-14 items-center justify-center rounded-2xl bg-active-gradient text-white shadow-glow transition-transform duration-300 motion-reduce:transition-none",
          dragging ? "-translate-y-1 scale-110" : "group-hover:-translate-y-1",
        )}
        aria-hidden
      >
        {busy ? <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" /> : <CloudUpload className="size-6" />}
      </span>
      <span className="flex flex-col gap-1">
        {busy ? (
          <span className="text-sm font-semibold">{busyLabel}</span>
        ) : (
          <span className="text-sm">
            <span className="font-semibold text-primary">{dragging ? "Thả file vào đây" : "Bấm để chọn file"}</span>
            {!dragging && <span className="text-muted-foreground"> hoặc kéo thả vào đây</span>}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formats}
          {hint && ` · ${hint}`}
        </span>
      </span>
    </label>
  );
}
