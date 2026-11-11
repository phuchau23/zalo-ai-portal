import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingRows } from "@/components/common/states";
import { PerformancePage } from "./performance-page";

export const metadata: Metadata = { title: "Hiệu suất nhân viên — Remi" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingRows rows={5} columns={5} label="Đang tải hiệu suất" />}>
      <PerformancePage />
    </Suspense>
  );
}
