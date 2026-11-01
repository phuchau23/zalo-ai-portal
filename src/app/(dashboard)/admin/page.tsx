import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { AdminTenants } from "./admin-tenants";

export const metadata: Metadata = { title: "Quản trị hệ thống — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ShieldCheck}
        title="Doanh nghiệp thuê"
        description="Các doanh nghiệp đang thuê: gói, hạn thuê, hạn mức hội thoại và chi phí AI. Chỉ tài khoản quản trị hệ thống thấy trang này."
        help={
          <ul>
            <li>
              <strong>Tạo doanh nghiệp</strong>: hệ thống cấp mật khẩu tạm cho chủ doanh nghiệp (chỉ hiện 1 lần, nhớ chép lại).
            </li>
            <li>Mở một doanh nghiệp để đổi gói, gia hạn, đặt hạn mức hội thoại, khóa / mở khóa, xuất hoặc xóa dữ liệu.</li>
            <li>Quá hạn thuê 3 ngày hệ thống tự khóa; trước hạn 7 ngày chủ doanh nghiệp thấy băng nhắc gia hạn.</li>
          </ul>
        }
      />
      <AdminTenants />
    </div>
  );
}
