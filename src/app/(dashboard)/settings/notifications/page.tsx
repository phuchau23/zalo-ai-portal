import type { Metadata } from "next";
import { HandoffForm } from "../handoff-form";

export const metadata: Metadata = { title: "Thông báo — Remi" };

export default function Page() {
  return <HandoffForm sections={["notify"]} />;
}
