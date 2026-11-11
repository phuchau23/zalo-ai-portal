import type { Metadata } from "next";
import { HandoffForm } from "../../settings/handoff-form";

export const metadata: Metadata = { title: "Chăm sóc chủ động — Remi" };

export default function Page() {
  return <HandoffForm sections={["care"]} />;
}
