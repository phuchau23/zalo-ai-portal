import type { Metadata } from "next";
import { TenantDetail } from "./tenant-detail";

export const metadata: Metadata = { title: "Doanh nghiệp — Quản trị hệ thống" };

export default async function Page({ params }: PageProps<"/admin/[id]">) {
  const { id } = await params;
  return <TenantDetail tenantId={id} />;
}
