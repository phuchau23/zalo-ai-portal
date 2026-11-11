import type { Metadata } from "next";
import { AdminTenants } from "./admin-tenants";

export const metadata: Metadata = { title: "Quản trị hệ thống — Remi" };

/** Tiêu đề trang nằm trong AdminTenants để nút "Tạo doanh nghiệp" ở phần đầu trang điều khiển được form tạo mới. */
export default function Page() {
  return <AdminTenants />;
}
