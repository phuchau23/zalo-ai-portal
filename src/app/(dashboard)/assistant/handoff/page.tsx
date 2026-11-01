import type { Metadata } from "next";
import { HandoffForm } from "../../settings/handoff-form";

export const metadata: Metadata = { title: "Chuyển nhân viên — Trợ lý Zalo AI" };

export default function Page() {
  return <HandoffForm sections={["hours", "messages"]} />;
}
