import type { Metadata } from "next";
import { CustomerProfile } from "./customer-profile";

export const metadata: Metadata = { title: "Hồ sơ khách — Trợ lý Zalo AI" };

export default async function Page({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  return <CustomerProfile contactId={id} />;
}
