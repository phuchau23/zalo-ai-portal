import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingRows } from "@/components/common/states";
import { AttendancePage } from "./attendance-page";

export const metadata: Metadata = { title: "Chấm công — Remi" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingRows rows={5} columns={5} label="Đang tải chấm công" />}>
      <AttendancePage />
    </Suspense>
  );
}
