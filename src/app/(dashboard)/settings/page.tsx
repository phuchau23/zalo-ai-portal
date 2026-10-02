import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Cài đặt — Trợ lý Zalo AI" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cài đặt doanh nghiệp</h1>
        <p className="text-muted-foreground">Thông tin bot dùng khi trò chuyện với khách của bạn.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
