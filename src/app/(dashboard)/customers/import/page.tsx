import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ContactImport } from "./contact-import";

export const metadata: Metadata = { title: "Nhập danh sách khách — Remi" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/customers", label: "Khách hàng" }}
        icon={FileSpreadsheet}
        title="Nhập danh sách khách"
        description="Đưa danh sách khách cũ (SĐT, đã làm gì, hẹn chăm sóc lại) vào hệ thống. Tới giờ hẹn, bot tự hỏi thăm khách đã từng nhắn Zalo OA; khách chưa nhắn OA thì hiện ở trang Cần chăm sóc để nhân viên gọi."
        help={
          <ol>
            <li>
              Tải <strong>file mẫu</strong>, đọc sheet &quot;Hướng dẫn&quot;, điền mỗi khách một dòng (SĐT là bắt buộc).
            </li>
            <li>Chọn file → xem trước: khách mới, khách cập nhật và dòng lỗi kèm lý do.</li>
            <li>
              Bấm <strong>Nhập</strong>. Nhập lại cùng file không tạo trùng, chỉ cập nhật.
            </li>
          </ol>
        }
      />
      <ContactImport />
    </div>
  );
}
