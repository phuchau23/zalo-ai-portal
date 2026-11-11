import type { Metadata } from "next";
import { BranchesSection } from "../branches-section";

export const metadata: Metadata = { title: "Chi nhánh & giờ mở cửa — Remi" };

export default function Page() {
  return <BranchesSection />;
}
