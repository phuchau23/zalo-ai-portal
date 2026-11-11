import type { Metadata } from "next";
import { isSalesTab } from "@/lib/sales";
import { SalesPage } from "./sales-page";

export const metadata: Metadata = { title: "Bán hàng — Remi" };

export default async function Page({ searchParams }: PageProps<"/sales">) {
  const { tab, new: openNew } = await searchParams;
  const initialTab = typeof tab === "string" && isSalesTab(tab) ? tab : "invoices";
  return <SalesPage initialTab={initialTab} openNew={openNew === "1"} />;
}
