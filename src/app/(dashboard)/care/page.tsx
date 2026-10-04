import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { CarePage } from "./care-page";

export const metadata: Metadata = { title: "Cần chăm sóc — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cần chăm sóc"
        description="Khách im lặng hoặc tới giờ hẹn chăm sóc: bot tự nhắn hỏi thăm (trong giờ cho phép, mỗi lần khách im lặng chỉ 1 tin). Trường hợp cần người — phàn nàn, sức khỏe, cần lịch trống hay giá riêng — hiện ở đây và báo Telegram để bạn liên hệ."
      />
      <CarePage />
    </div>
  );
}
