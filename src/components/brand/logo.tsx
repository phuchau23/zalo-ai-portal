import { cn } from "@/lib/utils";

/**
 * Dấu hiệu thương hiệu Remi (design.md § Thương hiệu): ô vuông xanh chanh bo góc, chữ "r" màu mực bằng Bricolage Grotesque.
 * Phẳng — không dải màu, không bóng. Kích thước theo `size` (px).
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center bg-lime font-display leading-none font-extrabold text-lime-foreground select-none", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), fontSize: Math.round(size * 0.66), paddingBottom: Math.round(size * 0.08), paddingLeft: Math.round(size * 0.03) }}
    >
      r
    </span>
  );
}

/** Chữ "remi" viết thường — tên sản phẩm trong thanh bên, trang đăng nhập. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-[20px] leading-none font-bold tracking-[-0.03em] text-foreground", className)}>remi</span>;
}

/** Tên sản phẩm cho trình đọc màn hình / tiêu đề trang. */
export const productName = "Remi";
