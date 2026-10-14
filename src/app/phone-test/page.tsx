import type { Metadata } from "next";
import { PhoneChat } from "./phone-chat";

export const metadata: Metadata = { title: "Khách nhắn thử — Trợ lý Zalo AI" };

/** Đóng vai khách trên giao diện chat như điện thoại (không có khung quản trị). Mở được trên điện thoại cùng Wi-Fi. */
export default function Page() {
  return <PhoneChat />;
}
