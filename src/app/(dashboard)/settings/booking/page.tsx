import type { Metadata } from "next";
import { CrmSettingsForm } from "../crm-settings-form";

export const metadata: Metadata = { title: "Lịch hẹn & bán hàng — Remi" };

export default function Page() {
  return <CrmSettingsForm />;
}
