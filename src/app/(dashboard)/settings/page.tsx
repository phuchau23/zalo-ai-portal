import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Cài đặt doanh nghiệp — Remi" };

export default function SettingsPage() {
  return <SettingsForm sections={["business", "privacy"]} />;
}
