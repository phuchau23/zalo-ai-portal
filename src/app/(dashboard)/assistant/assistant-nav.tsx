"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Headset, HeartHandshake, MessageCircleHeart, MessageSquareText, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SubNavLayout, type SubNavItem } from "@/components/common/sub-nav-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mọi cài đặt về cách trợ lý AI nói chuyện và chăm sóc khách, gom một chỗ. */
const items: SubNavItem[] = [
  { href: "/assistant", label: "Giọng văn & xưng hô", description: "Bot nói chuyện thế nào, xưng hô ra sao.", icon: MessageCircleHeart },
  { href: "/assistant/handoff", label: "Chuyển nhân viên", description: "Giờ làm việc, câu nhắn khi khách cần người thật.", icon: Headset },
  { href: "/assistant/care", label: "Chăm sóc chủ động", description: "Bot tự nhắn hỏi thăm khách im lặng, đúng giờ hẹn.", icon: HeartHandshake },
];

export function AssistantNav({ children }: { children: ReactNode }) {
  return (
    <SubNavLayout
      label="Mục thiết lập trợ lý"
      items={items}
      tone="ai"
      header={
        <PageHeader
          icon={SlidersHorizontal}
          tone="ai"
          title="Thiết lập trợ lý AI"
          description="Dạy trợ lý cách nói chuyện, khi nào chuyển nhân viên và khi nào tự nhắn hỏi thăm khách. Thay đổi áp dụng từ tin nhắn tiếp theo."
          actions={
            <Link href="/chat-test" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
              <MessageSquareText aria-hidden />
              Chat thử ngay
            </Link>
          }
          helpKey="assistant"
          help={
            <ul>
              <li>
                <strong>Giọng văn & xưng hô</strong>: chọn &quot;Như nhân viên thật&quot; để bot nhắn ngắn, tự nhiên như người thật.
              </li>
              <li>
                <strong>Chuyển nhân viên</strong>: soạn câu bot nói khi khách cần người, đặt giờ làm việc để ngoài giờ bot hẹn lại.
              </li>
              <li>
                <strong>Chăm sóc chủ động</strong>: bot tự hỏi thăm khách im lặng. Chuyện sức khỏe, phàn nàn luôn chuyển cho nhân viên.
              </li>
              <li>
                Bot trả lời dựa trên <strong>Kho kiến thức</strong>: thiếu dữ liệu thì bot nói thật và chuyển nhân viên, không bịa.
              </li>
            </ul>
          }
        />
      }
    >
      {children}
    </SubNavLayout>
  );
}
