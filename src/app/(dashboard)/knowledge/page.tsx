import type { Metadata } from "next";
import { KnowledgePage, type KnowledgeTab } from "./knowledge-page";

export const metadata: Metadata = { title: "Kho kiến thức — Trợ lý Zalo AI" };

const tabs: KnowledgeTab[] = ["items", "import", "history", "documents", "search"];

export default async function Page({ searchParams }: PageProps<"/knowledge">) {
  const { tab } = await searchParams;
  const initialTab = tabs.find((t) => t === tab) ?? "items";
  return <KnowledgePage initialTab={initialTab} />;
}
