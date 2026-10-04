import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { CustomersPage } from "./customers-page";

export const metadata: Metadata = { title: "Khách hàng — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Khách hàng"
        description="Mọi khách đã nhắn cho doanh nghiệp, xếp theo mức độ tiềm năng. Bot tự xếp Mới → Quan tâm → Nóng; bạn đổi tay được bất cứ lúc nào."
      />
      <CustomersPage />
    </div>
  );
}
