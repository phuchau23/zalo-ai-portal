"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Vùng chọn file: kéo thả hoặc bấm để chọn. Dùng <label> bọc <input type=file> thật
 * nên bàn phím và trình đọc màn hình dùng được như ô chọn file bình thường.
 */
export function FileDrop({
  accept,
  formats,
  hint,
  busy,
  busyLabel = "Đang tải lên...",
  disabled,
  onFile,
}: {
  /** Ví dụ ".xlsx,.json" */
  accept: string;
  /** Hiện cho người dùng, ví dụ "Excel (.xlsx) hoặc JSON" */
  formats: string;
  hint?: string;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const inactive = busy || disabled;

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (inactive) return;
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!inactive) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 px-4 py-8 text-center transition-colors",
        "hover:border-primary/60 hover:bg-accent/60 has-focus-visible:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        dragging && "border-primary bg-accent",
        inactive && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={inactive}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Cho phép chọn lại cùng một file sau khi sửa.
          e.target.value = "";
        }}
      />
      <span className="flex size-10 items-center justify-center rounded-md bg-background text-primary ring-1 ring-border">
        {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <Upload className="size-5" aria-hidden />}
      </span>
      <span className="text-sm">
        {busy ? (
          <span className="font-medium">{busyLabel}</span>
        ) : (
          <>
            <span className="font-medium text-primary">Bấm để chọn file</span> hoặc kéo thả vào đây
          </>
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {formats}
        {hint && ` · ${hint}`}
      </span>
    </label>
  );
}
