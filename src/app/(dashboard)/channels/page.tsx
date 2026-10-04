import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ChannelsPage } from "./channels-page";

export const metadata: Metadata = { title: "Kết nối kênh — Trợ lý Zalo AI" };

export default async function Page({ searchParams }: PageProps<"/channels">) {
  const { connected, error } = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Kết nối kênh" description="Kết nối Zalo Official Account để bot trả lời khách thật." />
      <ChannelsPage connected={typeof connected === "string" ? connected : undefined} error={typeof error === "string" ? error : undefined} />
    </div>
  );
}
