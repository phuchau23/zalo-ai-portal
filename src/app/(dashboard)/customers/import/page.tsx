import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ContactImport } from "./contact-import";

export const metadata: Metadata = { title: "Nhập danh sách khách — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/customers", label: "Khách hàng" }}
        title="Nhập danh sách khách"
        description="Đưa danh sách khách cũ (SĐT, đã làm gì, hẹn chăm sóc lại) vào hệ thống. Tới giờ hẹn, bot tự hỏi thăm khách đã từng nhắn Zalo OA; khách chưa nhắn OA thì hiện ở trang Cần chăm sóc để nhân viên gọi."
      />
      <ContactImport />
    </div>
  );
}
