import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { CarePage } from "./care-page";

export const metadata: Metadata = { title: "Cần chăm sóc — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={HeartHandshake}
        title="Cần chăm sóc"
        description="Khách nên được liên hệ: bot đã tự nhắn hỏi thăm, hoặc cần người thật (phàn nàn, sức khỏe, giá riêng). Mỗi thẻ có lý do, việc nên làm và tin nháp."
        help={
          <ul>
            <li>
              Bot <strong>tự nhắn</strong> khách im lặng lâu hoặc tới giờ hẹn chăm sóc (trong khung giờ cho phép, mỗi lần khách im lặng chỉ 1 tin). Thẻ &quot;Bot đã nhắn&quot; để bạn theo dõi.
            </li>
            <li>
              Thẻ <strong>Cần nhân viên liên hệ</strong>: đọc lý do, sửa tin nháp rồi bấm <strong>Nhắn ngay</strong>, hoặc gọi điện; xong thì chọn kết quả.
            </li>
            <li>
              Đặt giờ chăm sóc trong <strong>Nhật ký chăm sóc</strong> ở hồ sơ khách; đổi cách bot chăm sóc ở <strong>Thiết lập trợ lý → Chăm sóc chủ động</strong>.
            </li>
          </ul>
        }
      />
      <CarePage />
    </div>
  );
}
