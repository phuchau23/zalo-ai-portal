import type { Metadata } from "next";
import { ImportReview } from "./import-review";

export const metadata: Metadata = { title: "Duyệt nhập dữ liệu — Trợ lý Zalo AI" };

export default async function Page({ params }: PageProps<"/knowledge/imports/[importId]">) {
  const { importId } = await params;
  return <ImportReview importId={importId} />;
}
