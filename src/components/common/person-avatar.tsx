import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sáu dải màu (định nghĩa ở globals.css). Liệt kê đủ tên lớp để Tailwind sinh CSS. */
const tones = ["avatar-tone-1", "avatar-tone-2", "avatar-tone-3", "avatar-tone-4", "avatar-tone-5", "avatar-tone-6"] as const;

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-lg",
};

/** Hai ký tự đại diện: chữ/số đầu của hai từ cuối ("Nguyễn Thị Lan" → "TL", "Khách ...3a14" → "K3"). */
export function avatarInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .filter(Boolean);
  return ((words.at(-2) ?? "") + (words.at(-1) ?? "")).toUpperCase() || "?";
}

/** Màu cố định theo tên: cùng một người luôn cùng một màu ở mọi trang. */
export function avatarTone(name: string): (typeof tones)[number] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return tones[hash % tones.length];
}

/**
 * Ảnh đại diện bằng chữ cái đầu trên nền dải màu (khách, nhân viên). Chỉ để trang trí — tên luôn hiện bên cạnh.
 * `badge`: một chấm/biểu tượng nhỏ ở góc dưới phải (ví dụ: bot đang trả lời, khách khẩn cấp).
 */
export function PersonAvatar({ name, size = "md", badge, className }: { name: string; size?: keyof typeof sizes; badge?: ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden>
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-background",
          sizes[size],
          avatarTone(name),
        )}
      >
        {avatarInitials(name)}
      </span>
      {badge && <span className="absolute -right-0.5 -bottom-0.5 flex">{badge}</span>}
    </span>
  );
}
