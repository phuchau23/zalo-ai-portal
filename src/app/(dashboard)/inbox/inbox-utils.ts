import type { InboxItem } from "@/lib/api/client";

export type InboxFilter = "attention" | "human" | "bot" | "mine" | "all";

export const filters: { value: InboxFilter; label: string }[] = [
  { value: "attention", label: "Cần bạn" },
  { value: "human", label: "Nhân viên đang xử lý" },
  { value: "bot", label: "Bot đang trả lời" },
  { value: "mine", label: "Của tôi" },
  { value: "all", label: "Tất cả" },
];

/** Mức độ cần chú ý của một hội thoại — quyết định màu và vị trí. */
export type Priority = "urgent" | "attention" | "human" | "bot";

export function priorityOf(item: Pick<InboxItem, "urgency" | "needsAttentionSince" | "mode">): Priority {
  if (item.needsAttentionSince && item.urgency === "urgent") return "urgent";
  if (item.needsAttentionSince) return "attention";
  return item.mode === "human" ? "human" : "bot";
}

/** "vừa xong", "5 phút", "2 giờ", "3 ngày" — dùng cho thời gian chờ / tin cuối. */
export function elapsed(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

/** Tên tab trình duyệt: "(3) Hộp thư" khi có khách đang chờ. */
export function documentTitle(attentionCount: number): string {
  return attentionCount > 0 ? `(${attentionCount}) Hộp thư — Trợ lý Zalo AI` : "Hộp thư — Trợ lý Zalo AI";
}

export const senderLabels: Record<string, string> = {
  customer: "Khách",
  bot: "Bot",
  staff: "Nhân viên",
  system: "Tin tự động",
};
