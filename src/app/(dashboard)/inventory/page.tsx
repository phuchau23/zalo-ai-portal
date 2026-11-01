import type { Metadata } from "next";
import { isInventoryTab } from "@/lib/inventory";
import { InventoryPage } from "./inventory-page";

export const metadata: Metadata = { title: "Kho hàng — Trợ lý Zalo AI" };

export default async function Page({ searchParams }: PageProps<"/inventory">) {
  const { tab } = await searchParams;
  const initialTab = typeof tab === "string" && isInventoryTab(tab) ? tab : "stock";
  return <InventoryPage initialTab={initialTab} />;
}
