import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingRows } from "@/components/common/states";
import { ReportsPage } from "./reports-page";

export const metadata: Metadata = { title: "Báo cáo — Remi" };

export default function Page() {
  // useSearchParams (?tab=&from=&to=&branch=) cần Suspense để trang vẫn dựng tĩnh được.
  return (
    <Suspense fallback={<LoadingRows rows={4} columns={4} label="Đang tải báo cáo" />}>
      <ReportsPage />
    </Suspense>
  );
}
