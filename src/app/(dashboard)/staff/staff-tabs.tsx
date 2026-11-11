"use client";

import { usePathname } from "next/navigation";
import { Clock4, HandCoins, Trophy, UsersRound } from "lucide-react";
import { LinkTabs } from "@/components/common/link-tabs";

const tabs = [
  { href: "/staff", label: "Hồ sơ & ca làm", icon: UsersRound },
  { href: "/staff/performance", label: "Hiệu suất", icon: Trophy },
  { href: "/staff/commissions", label: "Hoa hồng", icon: HandCoins },
  { href: "/staff/attendance", label: "Chấm công", icon: Clock4 },
];

/** Bốn mục của khu Nhân viên, mỗi mục một đường dẫn (gửi link được). */
export function StaffTabs() {
  const pathname = usePathname();
  return <LinkTabs label="Mục nhân viên" tabs={tabs.map((t) => ({ ...t, active: t.href === "/staff" ? pathname === "/staff" : pathname.startsWith(t.href) }))} />;
}
