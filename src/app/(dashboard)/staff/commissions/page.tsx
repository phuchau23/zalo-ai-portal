import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingRows } from "@/components/common/states";
import { CommissionsPage } from "./commissions-page";

export const metadata: Metadata = { title: "Hoa hồng — Remi" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingRows rows={4} columns={4} label="Đang tải hoa hồng" />}>
      <CommissionsPage />
    </Suspense>
  );
}
