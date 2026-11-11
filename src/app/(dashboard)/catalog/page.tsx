import type { Metadata } from "next";
import { isCatalogKind } from "@/lib/crm";
import { CatalogPage } from "./catalog-page";

export const metadata: Metadata = { title: "Danh mục bán — Remi" };

export default async function Page({ searchParams }: PageProps<"/catalog">) {
  const { tab } = await searchParams;
  const initialTab = typeof tab === "string" && isCatalogKind(tab) ? tab : "service";
  return <CatalogPage initialTab={initialTab} />;
}
