/** Hàm thuần cho dashboard chủ doanh nghiệp (trang Tổng quan). */

/** Tỷ lệ bot tự xử lý (0–100, làm tròn). null khi chưa có hội thoại. */
export function botRate(handled: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((Math.min(handled, total) / total) * 100);
}

/** Mốc trên cùng của trục biểu đồ: số "tròn" ≥ max (1, 2, 5 × 10^n), tối thiểu 5 để cột không bị phóng to khi số nhỏ. */
export function niceMax(max: number): number {
  if (max <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 5, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/** "2026-10-14" → "14/10" (ngày giờ Việt Nam do BE tính sẵn). */
export function dayLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

/** "2026-10-14" → "Thứ Ba, 14/10". */
export function dayLongLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const names = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${names[weekday]}, ${day}/${month}`;
}

export function unansweredReasonLabel(reason: string): string {
  return reason === "low_confidence" ? "Bot không chắc" : "Thiếu dữ liệu";
}
