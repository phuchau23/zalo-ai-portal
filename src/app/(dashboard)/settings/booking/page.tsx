import type { Metadata } from "next";
import { CrmSettingsForm } from "../crm-settings-form";

export const metadata: Metadata = { title: "Lịch hẹn & bán hàng — Trợ lý Zalo AI" };

export default function Page() {
  return <CrmSettingsForm />;
}
