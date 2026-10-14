import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatTestPage } from "./chat-test-page";

export const metadata: Metadata = { title: "Chat thử — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Chat thử"
        description="Đóng vai khách để kiểm tra câu trả lời của bot trước khi bật cho khách thật. Mỗi tin nhắn đều gọi AI thật và tính chi phí."
        actions={
          <Link href="/phone-test" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
            <Smartphone aria-hidden />
            Giao diện điện thoại
          </Link>
        }
      />
      <ChatTestPage />
    </div>
  );
}
