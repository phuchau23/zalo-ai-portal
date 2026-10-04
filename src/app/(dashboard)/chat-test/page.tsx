import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ChatTestPage } from "./chat-test-page";

export const metadata: Metadata = { title: "Chat thử — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Chat thử"
        description="Đóng vai khách để kiểm tra câu trả lời của bot trước khi bật cho khách thật. Mỗi tin nhắn đều gọi AI thật và tính chi phí."
      />
      <ChatTestPage />
    </div>
  );
}
