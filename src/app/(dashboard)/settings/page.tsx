import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Cài đặt — Trợ lý Zalo AI" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-2">
      <PageHeader title="Cài đặt doanh nghiệp" description="Thông tin bot dùng khi trò chuyện với khách của bạn." />
      <SettingsForm />
    </div>
  );
}
