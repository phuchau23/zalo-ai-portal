/** Nhãn, màu và tính toán dùng chung cho trang Khách hàng và Cần chăm sóc (M6). */

export type BadgeVariant = "default" | "info" | "success" | "warning" | "secondary" | "destructive" | "outline";

export type LeadStatus = "new" | "interested" | "hot" | "won" | "lost";

export const leadStatuses: { value: LeadStatus; label: string; hint: string; variant: BadgeVariant }[] = [
  { value: "new", label: "Mới", hint: "Mới nhắn, chưa rõ nhu cầu", variant: "outline" },
  { value: "interested", label: "Quan tâm", hint: "Đã nói nhu cầu hoặc hỏi nhiều", variant: "info" },
  { value: "hot", label: "Nóng", hint: "Để lại số điện thoại, muốn đặt lịch", variant: "warning" },
  { value: "won", label: "Đã chốt", hint: "Đã mua / đặt lịch", variant: "success" },
  { value: "lost", label: "Không tiềm năng", hint: "Không có nhu cầu", variant: "secondary" },
];

export function leadStatusOf(value: string) {
  return leadStatuses.find((s) => s.value === value) ?? { value: value as LeadStatus, label: value, hint: "", variant: "outline" as const };
}

export const noteKinds: { value: "note" | "service" | "appointment"; label: string }[] = [
  { value: "service", label: "Đã dùng dịch vụ" },
  { value: "appointment", label: "Lịch hẹn" },
  { value: "note", label: "Ghi chú" },
];

export function noteKindLabel(value: string): string {
  return noteKinds.find((k) => k.value === value)?.label ?? "Ghi chú";
}

export const temperatures: Record<string, { label: string; variant: BadgeVariant }> = {
  hot: { label: "Nóng", variant: "destructive" },
  warm: { label: "Ấm", variant: "warning" },
  cold: { label: "Nguội", variant: "info" },
};

const triggerLabels: Record<string, string> = {
  price_no_close: "Hỏi giá chưa chốt",
  thinking: "Đang cân nhắc",
  asked_schedule: "Hỏi lịch chưa đặt",
  complaint_followup: "Hỏi lại sau phàn nàn",
  win_back: "Lâu không quay lại",
  unused_package: "Còn gói chưa dùng",
  follow_up: "Tới giờ hẹn chăm sóc",
  other: "Cần hỏi thăm",
};

export function triggerLabel(value: string): string {
  return triggerLabels[value] ?? triggerLabels.other;
}

export const outcomes: { value: "booked" | "bought" | "declined" | "no_response" | "other"; label: string }[] = [
  { value: "booked", label: "Đã đặt lịch" },
  { value: "bought", label: "Đã mua" },
  { value: "declined", label: "Khách từ chối" },
  { value: "no_response", label: "Không phản hồi" },
  { value: "other", label: "Khác" },
];

export function outcomeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "customer_replied") return "Khách đã nhắn lại";
  return outcomes.find((o) => o.value === value)?.label ?? value;
}

const day = 24 * 60 * 60 * 1000;

function span(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "dưới 1 giờ";
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(ms / day)} ngày`;
}

export type MessagingWindow = { canMessage: boolean; tone: "ok" | "soon" | "closed" | "none"; text: string };

/**
 * Còn nhắn được qua kênh không (Zalo: 7 ngày sau tin cuối của khách; trong 48 giờ đầu miễn phí).
 * Không có hạn (chat thử) → luôn nhắn được.
 */
export function messagingWindow(
  s: { messagingDeadline: string | null; freeUntil: string | null },
  now: number,
): MessagingWindow {
  if (!s.messagingDeadline) return { canMessage: true, tone: "none", text: "Không giới hạn thời gian nhắn" };
  const left = new Date(s.messagingDeadline).getTime() - now;
  if (left <= 0) return { canMessage: false, tone: "closed", text: "Đã quá 7 ngày — Zalo không cho nhắn tư vấn nữa, hãy gọi điện" };
  const free = s.freeUntil ? new Date(s.freeUntil).getTime() - now : 0;
  const suffix = free > 0 ? ` · miễn phí thêm ${span(free)}` : " · ngoài 48 giờ, tin có thể tính phí";
  return { canMessage: true, tone: left < 2 * day ? "soon" : "ok", text: `Còn nhắn được qua Zalo: ${span(left)}${suffix}` };
}

/** Ngày hôm nay theo giờ Việt Nam, dạng yyyy-MM-dd (giá trị cho <input type="date">). */
export function todayVn(now = Date.now()): string {
  return new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "2026-10-12" → "12/10/2026". */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

/** Tách ô nhập nhãn "VIP, khách cũ" → ["VIP", "khách cũ"], bỏ trùng không phân biệt hoa thường. */
export function parseTags(input: string, existing: string[] = []): string[] {
  const result = [...existing];
  for (const raw of input.split(",")) {
    const tag = raw.trim().slice(0, 30);
    if (tag && !result.some((t) => t.toLowerCase() === tag.toLowerCase())) result.push(tag);
  }
  return result.slice(0, 20);
}

const vnOffsetMs = 7 * 60 * 60 * 1000;

/** Thời điểm → giá trị cho <input type="datetime-local"> theo giờ Việt Nam ("2026-10-12T09:30"). */
export function toVnLocalInput(ms: number): string {
  return new Date(ms + vnOffsetMs).toISOString().slice(0, 16);
}

/** "2026-10-12T09:30" (giờ Việt Nam, từ ô nhập) → "2026-10-12T09:30:00+07:00" gửi BE. Trống → null. */
export function vnLocalToIso(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : null;
}

/** Thời điểm (ISO) → "09:30 12/10/2026" theo giờ Việt Nam. */
export function formatVnTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const [date, time] = toVnLocalInput(new Date(iso).getTime()).split("T");
  return `${time} ${formatDay(date)}`;
}

/** Gợi ý nhanh cho ô "lúc chăm sóc lại". */
export function followUpPresets(now: number): { label: string; value: string }[] {
  const tomorrow9 = toVnLocalInput(now + 24 * 60 * 60 * 1000).slice(0, 10) + "T09:00";
  const nextWeek9 = toVnLocalInput(now + 7 * 24 * 60 * 60 * 1000).slice(0, 10) + "T09:00";
  return [
    { label: "5 phút nữa", value: toVnLocalInput(now + 5 * 60 * 1000) },
    { label: "Mai 9:00", value: tomorrow9 },
    { label: "1 tuần nữa", value: nextWeek9 },
  ];
}

const escalationLabels: Record<string, string> = {
  complaint: "Khách phàn nàn / không hài lòng",
  sensitive: "Chuyện sức khỏe / nhạy cảm",
  needs_staff_info: "Khách cần thông tin chỉ nhân viên có (lịch trống, giá riêng…)",
  draft_blocked: "Tin AI soạn có nội dung bot không được tự gửi (giá, câu cấm)",
  promotional_no_consent: "Tin mang tính quảng cáo — khách chưa đồng ý nhận tin",
  staff_handling: "Nhân viên đang phụ trách cuộc trò chuyện",
  outside_window: "Quá 7 ngày, Zalo không cho nhắn — hãy gọi điện",
  other: "AI thấy nên để người liên hệ",
};

/** Vì sao bot không tự nhắn mà cần nhân viên. */
export function escalationLabel(value: string | null | undefined): string | null {
  return value ? (escalationLabels[value] ?? escalationLabels.other) : null;
}

export const careStatusLabels: Record<string, string> = {
  open: "Cần làm",
  autosent: "Bot đã nhắn",
  done: "Đã xử lý",
  skipped: "Đã bỏ qua",
  expired: "Hết hạn nhắn",
};
