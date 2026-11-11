import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatTestPage } from "./chat-test-page";

export const metadata: Metadata = { title: "Chat thử — Remi" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={MessageSquareText}
        tone="ai"
        title="Chat thử"
        description="Đóng vai khách để kiểm tra câu trả lời của bot trước khi bật cho khách thật. Mỗi tin nhắn đều gọi AI thật và tính chi phí."
        actions={
          <Link href="/phone-test" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
            <Smartphone aria-hidden />
            Giao diện điện thoại
          </Link>
        }
        help={
          <ul>
            <li>Gõ câu như khách thật hay hỏi (giá, giờ trống, đặt lịch...) và xem bot trả lời.</li>
            <li>
              Bấm <strong>Vì sao?</strong> dưới câu trả lời để biết bot dựa vào mục nào trong Kho kiến thức; trả lời sai thì sửa dữ liệu ở đó.
            </li>
            <li>
              Tab <strong>Giọng văn</strong> bên phải để đổi cách bot nói chuyện và thử lại ngay. Mở <strong>Giao diện điện thoại</strong> để xem như khách thấy trên Zalo.
            </li>
          </ul>
        }
      />
      <ChatTestPage />
    </div>
  );
}
