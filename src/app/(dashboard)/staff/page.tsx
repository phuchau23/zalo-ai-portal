import type { Metadata } from "next";
import { StaffPage } from "./staff-page";

export const metadata: Metadata = { title: "Nhân viên & ca làm — Remi" };

export default function Page() {
  return <StaffPage />;
}
