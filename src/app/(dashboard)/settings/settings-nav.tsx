"use client";

import type { ReactNode } from "react";
import { BellRing, Building2, CalendarCog, KeyRound, Landmark, MapPin, Settings } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SubNavLayout, type SubNavItem } from "@/components/common/sub-nav-layout";

/** Cài đặt của doanh nghiệp, mỗi mục một trang con. Cài đặt về cách bot nói chuyện nằm ở Thiết lập trợ lý (/assistant). */
const items: SubNavItem[] = [
  { href: "/settings", label: "Doanh nghiệp", description: "Tên, ngành, link chính sách bảo mật.", icon: Building2 },
  { href: "/settings/branches", label: "Chi nhánh & giờ mở cửa", description: "Cơ sở, giờ mở cửa, ngày nghỉ, giường/phòng.", icon: MapPin },
  { href: "/settings/team", label: "Tài khoản & phân quyền", description: "Ai được đăng nhập và được làm gì.", icon: KeyRound },
  { href: "/settings/booking", label: "Lịch hẹn & bán hàng", description: "Bước lịch, bot tự chốt lịch, nhắc lịch, giảm giá.", icon: CalendarCog },
  { href: "/settings/payments", label: "Thanh toán", description: "Tài khoản ngân hàng nhận chuyển khoản (VietQR).", icon: Landmark },
  { href: "/settings/notifications", label: "Thông báo", description: "Nhóm Telegram nhận báo khi khách cần người.", icon: BellRing },
];

export function SettingsNav({ children }: { children: ReactNode }) {
  return (
    <SubNavLayout
      label="Mục cài đặt"
      items={items}
      header={
        <PageHeader
          icon={Settings}
          title="Cài đặt"
          description="Thông tin doanh nghiệp, chi nhánh, tài khoản nhân viên và các quy ước chung. Cách bot trả lời khách nằm ở mục Thiết lập trợ lý."
          helpKey="settings"
          help={
            <ul>
              <li>
                Chọn mục bên trái (trên điện thoại: hàng nút phía trên). Mỗi mục có nút <strong>Lưu</strong> riêng.
              </li>
              <li>
                Mới dùng: điền <strong>Doanh nghiệp</strong> → <strong>Chi nhánh & giờ mở cửa</strong> → thêm nhân viên ở{" "}
                <strong>Tài khoản & phân quyền</strong>.
              </li>
              <li>Nhân viên chỉ xem được; chỉ chủ doanh nghiệp (hoặc người được cấp quyền) mới sửa.</li>
            </ul>
          }
        />
      }
    >
      {children}
    </SubNavLayout>
  );
}
