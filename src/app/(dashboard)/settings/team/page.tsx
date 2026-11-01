import type { Metadata } from "next";
import { TeamSection } from "../team-section";

export const metadata: Metadata = { title: "Tài khoản & phân quyền — Trợ lý Zalo AI" };

export default function Page() {
  return <TeamSection />;
}
