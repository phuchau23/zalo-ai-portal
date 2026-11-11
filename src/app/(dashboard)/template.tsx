"use client";

import { motion } from "motion/react";
import { easeOut } from "@/lib/motion";

/**
 * Hiệu ứng vào trang: nội dung mờ → rõ và trượt lên nhẹ mỗi khi chuyển sang mục menu khác.
 * template.tsx được Next.js gắn lại khi đổi trang cấp một (/customers → /sales); trang con (/settings/team) và
 * tham số (?c=...) không gắn lại nên không nháy.
 */
export default function DashboardTemplate({ children }: LayoutProps<"/">) {
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
