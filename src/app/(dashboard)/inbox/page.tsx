import type { Metadata } from "next";
import { InboxPage } from "./inbox-page";

export const metadata: Metadata = { title: "Hộp thư — Remi" };

export default async function Page({ searchParams }: PageProps<"/inbox">) {
  const { c } = await searchParams;
  return <InboxPage initialConversationId={typeof c === "string" ? c : undefined} />;
}
