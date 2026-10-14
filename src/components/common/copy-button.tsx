"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Nút chép một đoạn chữ (mật khẩu tạm, mã kết nối...) vào bộ nhớ tạm. */
export function CopyButton({ text, label = "Chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-11 sm:h-8"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Đã chép" : label}
    </Button>
  );
}
