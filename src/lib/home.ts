/** Hàm thuần cho trang Tổng quan (trang chủ của chủ doanh nghiệp). */

const vnHourFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" });
const vnLongDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Giờ hiện tại (0–23) theo giờ Việt Nam. */
export function vnHour(now: number): number {
  return Number(vnHourFormat.format(new Date(now))) % 24;
}

/** Lời chào theo giờ: sáng 4–10h, trưa 11–12h, chiều 13–17h, tối 18–3h. */
export function greeting(hour: number): string {
  if (hour >= 4 && hour < 11) return "Chào buổi sáng";
  if (hour >= 11 && hour < 13) return "Chào buổi trưa";
  if (hour >= 13 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** "Chủ Nhật, 01/11/2026" — viết hoa chữ đầu thứ. */
export function longDateVn(now: number): string {
  const text = vnLongDate.format(new Date(now));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Tên gọi ngắn để chào: tên cuối của họ tên người Việt ("Nguyễn Thị Lan" → "Lan").
 * Hơn 4 chữ thường không phải họ tên (ví dụ "Chủ Khoa Học Huyệt Đạo") → giữ nguyên.
 */
export function firstName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length > 4) return fullName.trim();
  return words.at(-1) ?? fullName;
}

/** Phần trăm làm tròn; tổng 0 → null (hiện "—"). */
export function percent(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

export type SetupStep = { key: string; title: string; description: string; href: string; done: boolean };

/** Tiến độ thiết lập: số bước xong, tổng, và bước nên làm tiếp (bước chưa xong đầu tiên). */
export function setupProgress(steps: SetupStep[]): { done: number; total: number; next: SetupStep | null } {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, next: steps.find((s) => !s.done) ?? null };
}

/** Số tiền gọn cho ô thống kê: 1.250.000 → "1,25 tr"; 12.500.000 → "12,5 tr"; dưới 1 triệu giữ đủ số. */
export function compactVnd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)} tr`;
  return `${value.toLocaleString("vi-VN")} đ`;
}

function trim(n: number): string {
  const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}
