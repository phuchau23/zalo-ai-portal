import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingRows } from "@/components/common/states";
import { AppointmentsPage } from "./appointments-page";

export const metadata: Metadata = { title: "Lịch hẹn — Remi" };

export default function Page() {
  // useSearchParams (?date=, ?contactId=) cần Suspense để trang vẫn dựng tĩnh được.
  return (
    <Suspense fallback={<LoadingRows rows={4} columns={3} label="Đang tải lịch hẹn" />}>
      <AppointmentsPage />
    </Suspense>
  );
}
