import type { Metadata } from "next";
import { isSalesTab } from "@/lib/sales";
import { SalesPage } from "./sales-page";

export const metadata: Metadata = { title: "Bán hàng — Trợ lý Zalo AI" };

export default async function Page({ searchParams }: PageProps<"/sales">) {
  const { tab } = await searchParams;
  const initialTab = typeof tab === "string" && isSalesTab(tab) ? tab : "invoices";
  return <SalesPage initialTab={initialTab} />;
}
