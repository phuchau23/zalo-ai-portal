/** Hàm thuần cho trang super admin và băng nhắc hạn thuê. Ngày giờ theo giờ Việt Nam. */

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type ExpiryState = { kind: "none" } | { kind: "soon"; daysLeft: number } | { kind: "expired"; daysOver: number };

/** Còn bao lâu hết hạn thuê. "soon" khi còn ≤ warningDays ngày (tính theo ngày lịch giờ VN). */
export function expiryState(expiresAt: string | null | undefined, now = Date.now(), warningDays = 7): ExpiryState {
  if (!expiresAt) return { kind: "none" };
  const end = vnDay(new Date(expiresAt).getTime());
  const today = vnDay(now);
  const diff = Math.round((end - today) / DAY_MS);
  if (new Date(expiresAt).getTime() < now) return { kind: "expired", daysOver: Math.max(0, -diff) };
  return diff <= warningDays ? { kind: "soon", daysLeft: diff } : { kind: "none" };
}

/** "2026-11-30" (ô chọn ngày) → hết ngày đó giờ VN, ISO kèm múi giờ. Rỗng → null (không thời hạn). */
export function vnDateToIso(date: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T23:59:59+07:00` : null;
}

/** ISO → "YYYY-MM-DD" theo giờ VN (cho ô chọn ngày). */
export function isoToVnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-01" → "10/2026". */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  return `${Number(m)}/${year}`;
}

export function tenantStatusLabel(status: string, reason: string | null | undefined): string {
  if (status === "active") return "Đang hoạt động";
  if (status === "suspended") return reason === "expired" ? "Tự khóa (quá hạn)" : "Đã khóa";
  return "Đã ngừng";
}

/** "12/100" hoặc "12 / không giới hạn". */
export function quotaLabel(used: number, quota: number | null | undefined): string {
  return quota === null || quota === undefined ? `${used} / không giới hạn` : `${used}/${quota}`;
}

function vnDay(ms: number): number {
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS;
}

/** ISO → "30/11/2026" theo giờ VN. */
export function formatVnDate(iso: string | null | undefined): string {
  const date = isoToVnDate(iso);
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
