import type { Metadata } from "next";
import { HandoffForm } from "../handoff-form";

export const metadata: Metadata = { title: "Thông báo — Trợ lý Zalo AI" };

export default function Page() {
  return <HandoffForm sections={["notify"]} />;
}
