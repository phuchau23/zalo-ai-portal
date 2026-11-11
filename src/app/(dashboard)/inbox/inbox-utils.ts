import type { InboxItem, InboxMessage } from "@/lib/api/client";

export type InboxFilter = "attention" | "human" | "bot" | "mine" | "all";

/** Nhãn ngắn để cả nhóm nút vừa cột danh sách; `title` giải thích đầy đủ. */
export const filters: { value: InboxFilter; label: string; title: string }[] = [
  { value: "attention", label: "Cần bạn", title: "Khách đang chờ nhân viên trả lời" },
  { value: "human", label: "Nhân viên", title: "Hội thoại nhân viên đang xử lý" },
  { value: "bot", label: "Bot", title: "Hội thoại bot đang tự trả lời" },
  { value: "mine", label: "Của tôi", title: "Hội thoại giao cho bạn" },
  { value: "all", label: "Tất cả", title: "Mọi hội thoại" },
];

/** Chữ thường, bỏ dấu tiếng Việt (kể cả đ) — để gõ "lan" tìm ra "Lan", "Lân", "Lản". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Lọc danh sách đang tải theo tên khách hoặc nội dung tin cuối (không cần gọi lại máy chủ). */
export function matchesSearch(item: Pick<InboxItem, "contactName" | "lastMessagePreview">, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(`${item.contactName} ${item.lastMessagePreview ?? ""}`).includes(q);
}

const weekdays = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function startOfDay(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nhãn ngăn cách ngày trong khung chat: "Hôm nay", "Hôm qua", "Thứ Hai, 27/10" (trong tuần), "27/10/2026". */
export function dayLabel(iso: string, now: number): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / 86_400_000);
  const dm = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days > 1 && days < 7) return `${weekdays[date.getDay()]}, ${dm}`;
  return `${dm}/${date.getFullYear()}`;
}

/** Vị trí của một tin trong cụm tin liên tiếp cùng người gửi — quyết định bo góc và chỗ hiện ảnh đại diện/giờ. */
export type RunPosition = "single" | "first" | "middle" | "last";

export type ThreadEntry =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; message: InboxMessage; position: RunPosition };

/** Hai tin cùng người gửi cách nhau quá mức này thì tách cụm (hiện lại giờ). */
const runGapMs = 5 * 60_000;

function sameRun(a: InboxMessage, b: InboxMessage): boolean {
  if (a.sender !== b.sender || a.sender === "system") return false;
  if (a.sender === "staff" && a.senderUserId !== b.senderUserId) return false;
  if (a.proactive !== b.proactive) return false;
  const gap = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return gap >= 0 && gap <= runGapMs && startOfDay(new Date(a.createdAt).getTime()) === startOfDay(new Date(b.createdAt).getTime());
}

/**
 * Dựng khung chat kiểu Messenger: chèn nhãn ngày khi sang ngày mới, gom tin liên tiếp của cùng người gửi (cách nhau ≤ 5 phút)
 * thành một cụm. Tin hệ thống luôn đứng riêng.
 */
export function buildThread(messages: InboxMessage[], now: number): ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  let lastDay = -1;
  messages.forEach((message, i) => {
    const day = startOfDay(new Date(message.createdAt).getTime());
    if (day !== lastDay) {
      entries.push({ kind: "day", key: `day-${day}`, label: dayLabel(message.createdAt, now) });
      lastDay = day;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const joinsPrev = prev ? sameRun(prev, message) : false;
    const joinsNext = next ? sameRun(message, next) : false;
    const position: RunPosition = joinsPrev ? (joinsNext ? "middle" : "last") : joinsNext ? "first" : "single";
    entries.push({ kind: "message", message, position });
  });
  return entries;
}

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
  return attentionCount > 0 ? `(${attentionCount}) Hộp thư — Remi` : "Hộp thư — Remi";
}

export const senderLabels: Record<string, string> = {
  customer: "Khách",
  bot: "Bot",
  staff: "Nhân viên",
  system: "Tin tự động",
};
