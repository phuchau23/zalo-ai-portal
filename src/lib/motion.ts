import type { Transition, Variants } from "motion/react";

/**
 * Nhịp chuyển động dùng chung cho cả trang quản trị (thư viện `motion`), để mọi hiệu ứng cùng một "cảm giác":
 * - `spring`: lò xo vừa phải cho thứ trượt/đổi chỗ (vạch mục đang chọn, tab, thanh bên mở rộng).
 * - `easeOut`: vào nhanh, dừng êm — cho nội dung xuất hiện.
 * Người dùng bật "giảm chuyển động" trong hệ điều hành: `MotionConfig reducedMotion="user"` ở AppShell tắt dịch chuyển, chỉ còn mờ dần.
 */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };
export const softSpring: Transition = { type: "spring", stiffness: 260, damping: 30 };
export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Nội dung hiện lên: mờ → rõ, trượt lên 8px. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeOut } },
};

/** Danh sách hiện lần lượt từng mục (mỗi mục cách nhau 40ms). Dùng cùng `fadeUp` cho mục con. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};
