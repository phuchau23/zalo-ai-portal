import type { Metadata } from "next";
import { HandoffForm } from "../../settings/handoff-form";

export const metadata: Metadata = { title: "Chăm sóc chủ động — Trợ lý Zalo AI" };

export default function Page() {
  return <HandoffForm sections={["care"]} />;
}
