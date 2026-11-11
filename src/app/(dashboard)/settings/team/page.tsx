import type { Metadata } from "next";
import { TeamSection } from "../team-section";

export const metadata: Metadata = { title: "Tài khoản & phân quyền — Remi" };

export default function Page() {
  return <TeamSection />;
}
