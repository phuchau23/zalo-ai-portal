import type { Metadata } from "next";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { HandoffForm } from "./handoff-form";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Cài đặt — Trợ lý Zalo AI" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Cài đặt doanh nghiệp" description="Thông tin bot dùng khi trò chuyện với khách của bạn." />
      <SettingsForm />
      <div id="handoff" className="mt-10 scroll-mt-6">
        <SectionHeader
          title="Chuyển tiếp & giờ làm việc"
          description="Bot chuyển khách cho nhân viên như thế nào, nhắn gì cho khách, và báo nhân viên ra sao."
        />
        <HandoffForm />
      </div>
    </div>
  );
}
