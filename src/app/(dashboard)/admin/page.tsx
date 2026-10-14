import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AdminTenants } from "./admin-tenants";

export const metadata: Metadata = { title: "Quản trị hệ thống — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Quản trị hệ thống" description="Các doanh nghiệp đang thuê: gói, hạn thuê, hạn mức hội thoại và chi phí AI. Chỉ tài khoản super admin thấy trang này." />
      <AdminTenants />
    </div>
  );
}
