import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { CustomersPage } from "./customers-page";

export const metadata: Metadata = { title: "Khách hàng — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="Khách hàng"
        description="Mọi khách đã nhắn hoặc đã đến, xếp theo mức độ tiềm năng. Bot tự xếp Mới → Quan tâm → Nóng; bạn đổi tay được bất cứ lúc nào."
        help={
          <ul>
            <li>
              Lọc theo tầng (Mới, Quan tâm, Nóng, Đã chốt, Không tiềm năng) hoặc gõ tên / SĐT để tìm nhanh.
            </li>
            <li>
              Mở hồ sơ để xem lịch sử chat, lịch hẹn, gói đang dùng, ví trả trước, hóa đơn và <strong>Nhật ký chăm sóc</strong>.
            </li>
            <li>
              Có danh sách khách cũ trong Excel? Bấm <strong>Nhập danh sách</strong> để đưa vào và hẹn bot hỏi thăm.
            </li>
          </ul>
        }
      />
      <CustomersPage />
    </div>
  );
}
