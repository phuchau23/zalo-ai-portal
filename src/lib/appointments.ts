/** Nhãn, màu và tính toán thuần cho Lịch hẹn (CRM C2): trạng thái, nguồn, giờ theo múi giờ doanh nghiệp, xếp khối trên lịch ngày. */

import type { BadgeVariant } from "./customers";
import { dayNames } from "./crm";

export const defaultTimeZone = "Asia/Ho_Chi_Minh";

export type AppointmentStatus = "booked" | "confirmed" | "arrived" | "in_progress" | "done" | "no_show" | "cancelled";

export const appointmentStatuses: AppointmentStatus[] = ["booked", "confirmed", "arrived", "in_progress", "done", "no_show", "cancelled"];

export const statusLabels: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  booked: { label: "Đã đặt", variant: "secondary" },
  confirmed: { label: "Đã xác nhận", variant: "default" },
  arrived: { label: "Đã đến", variant: "info" },
  in_progress: { label: "Đang làm", variant: "info" },
  done: { label: "Hoàn thành", variant: "success" },
  no_show: { label: "Không đến", variant: "destructive" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

export function statusLabel(value: string): { label: string; variant: BadgeVariant } {
  return statusLabels[value as AppointmentStatus] ?? { label: value, variant: "outline" };
}

/** Lớp Tailwind (token màu) cho khối lịch theo trạng thái; không dùng mã màu trực tiếp. */
export const statusBlockClasses: Record<AppointmentStatus, string> = {
  booked: "bg-muted text-foreground",
  confirmed: "bg-primary/10 text-foreground",
  arrived: "bg-chart-2/20 text-foreground",
  in_progress: "bg-chart-2/20 text-foreground",
  done: "bg-success/10 text-foreground",
  no_show: "bg-destructive/10 text-muted-foreground line-through",
  cancelled: "bg-destructive/10 text-muted-foreground line-through",
};

export function statusBlockClass(value: string): string {
  return statusBlockClasses[value as AppointmentStatus] ?? "bg-muted text-foreground";
}

export const sourceLabels: Record<string, string> = {
  bot: "Bot đặt qua chat",
  staff: "Nhân viên đặt",
  online: "Khách đặt online",
  walk_in: "Khách đến trực tiếp",
};

export function sourceLabel(value: string): string {
  return sourceLabels[value] ?? value;
}

export const eventKindLabels: Record<string, string> = {
  created: "Đã tạo",
  rescheduled: "Đã dời",
  cancelled: "Đã hủy",
  status_changed: "Đổi trạng thái",
  reminder_sent: "Đã nhắc",
  reminder_skipped: "Không nhắc được (khách chỉ có SĐT)",
  confirmed: "Khách xác nhận",
  brief_written: "AI đã tóm tắt",
  assigned: "Đã xếp người",
};

export function eventKindLabel(value: string): string {
  return eventKindLabels[value] ?? value;
}

export const actorLabels: Record<string, string> = {
  staff: "Nhân viên",
  bot: "Bot",
  customer: "Khách",
  system: "Hệ thống",
};

export function actorLabel(value: string): string {
  return actorLabels[value] ?? value;
}

/** Lỗi từng lần trong chuỗi lịch lặp (POST /appointments/series). */
export const seriesErrorLabels: Record<string, string> = {
  slot_unavailable: "Kín giờ",
  too_soon: "Quá gần",
  too_far: "Quá xa",
  branch_inactive: "Chi nhánh ngừng hoạt động",
  not_found: "Không tìm thấy",
};

export function seriesErrorLabel(value: string | null | undefined): string {
  if (!value) return "";
  return seriesErrorLabels[value] ?? value;
}

/** Trạng thái kết thúc: không còn thao tác (trừ ghi chú). */
export function isTerminal(status: string): boolean {
  return status === "done" || status === "no_show" || status === "cancelled";
}

/** Các trạng thái có thể chuyển tới từ trạng thái hiện tại (thứ tự = thứ tự nút). */
export function nextStatuses(status: string): AppointmentStatus[] {
  switch (status) {
    case "booked":
    case "confirmed":
      return ["arrived", "no_show"];
    case "arrived":
      return ["in_progress", "done"];
    case "in_progress":
      return ["done"];
    default:
      return [];
  }
}

/** Còn dời/hủy được không (chưa làm, chưa kết thúc). */
export function canReschedule(status: string): boolean {
  return status === "booked" || status === "confirmed";
}

export function canCancel(status: string): boolean {
  return status === "booked" || status === "confirmed" || status === "arrived";
}

// ---------- Múi giờ ----------

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** Múi giờ hợp lệ theo Intl; sai → múi giờ Việt Nam. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return defaultTimeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return defaultTimeZone;
  }
}

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const tz = safeTimeZone(timeZone);
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(tz, f);
  }
  return f;
}

export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** Các phần ngày giờ của một thời điểm theo múi giờ cho trước. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Một số bản ICU trả giờ "24" lúc 0h dù đã đặt h23.
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}

/** Chênh lệch (phút) giữa múi giờ và UTC tại thời điểm `date`; Việt Nam = 420. */
export function tzOffsetMinutes(timeZone: string, date: Date): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Thời điểm ISO → "yyyy-MM-ddTHH:mm" theo múi giờ doanh nghiệp (giá trị cho <input type="datetime-local">). */
export function toLocalInput(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * "yyyy-MM-ddTHH:mm" (giờ địa phương doanh nghiệp) → ISO có offset cố định, ví dụ "2026-10-15T09:30:00+07:00".
 * Offset lấy từ Intl cho múi giờ đó tại thời điểm ấy (xấp xỉ; phút chuyển DST hiếm có thể lệch 1 giờ). Sai định dạng → null.
 */
export function fromLocalInput(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const guess = new Date(`${value}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const first = tzOffsetMinutes(timeZone, guess);
  const offset = tzOffsetMinutes(timeZone, new Date(guess.getTime() - first * 60_000));
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `${value}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Ngày "yyyy-MM-dd" của một thời điểm theo múi giờ doanh nghiệp. */
export function dateKeyOf(iso: string | Date, timeZone: string): string {
  return toLocalInput(iso, timeZone).slice(0, 10);
}

/** Hôm nay theo múi giờ doanh nghiệp. */
export function todayKey(timeZone: string, now = Date.now()): string {
  return dateKeyOf(new Date(now), timeZone);
}

/** Số phút kể từ 0h (theo múi giờ doanh nghiệp) của một thời điểm. */
export function minutesOfDay(iso: string, timeZone: string): number {
  const p = zonedParts(new Date(iso), timeZone);
  return p.hour * 60 + p.minute;
}

/** "HH:mm" theo múi giờ doanh nghiệp. */
export function formatTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const p = zonedParts(new Date(iso), timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "09:30 – 10:30". */
export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatTime(startIso, timeZone)} – ${formatTime(endIso, timeZone)}`;
}

/** "HH:mm dd/MM/yyyy" theo múi giờ doanh nghiệp. */
export function formatDateTimeTz(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const p = zonedParts(new Date(iso), timeZone);
  return `${pad(p.hour)}:${pad(p.minute)} ${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

// ---------- Ngày dạng "yyyy-MM-dd" (không phụ thuộc múi giờ) ----------

export function isDateKey(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Thứ trong tuần (0 = Chủ nhật) của ngày "yyyy-MM-dd". */
export function dayOfWeekOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** Thứ hai của tuần chứa ngày này. */
export function weekStart(key: string): string {
  const dow = dayOfWeekOf(key);
  return addDays(key, -((dow + 6) % 7));
}

/** 7 ngày T2 → CN của tuần chứa ngày này. */
export function weekDays(key: string): string[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "T3 14/10" từ "2026-10-14". */
export function formatDayShort(key: string): string {
  const [, m, d] = key.split("-");
  return `${dayNames[dayOfWeekOf(key)]} ${d}/${m}`;
}

/** "Thứ ba, 14/10/2026". */
export function formatDayLong(key: string): string {
  const [y, m, d] = key.split("-");
  const names = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  return `${names[dayOfWeekOf(key)]}, ${d}/${m}/${y}`;
}

/** Thời điểm ISO (offset doanh nghiệp) của 0h ngày `key`. */
export function startOfDayIso(key: string, timeZone: string): string {
  return fromLocalInput(`${key}T00:00`, timeZone) ?? `${key}T00:00:00Z`;
}

// ---------- Lưới lịch ngày ----------

export type GridRange = { startMinutes: number; endMinutes: number };

/** Khung giờ của lưới ngày: từ giờ mở sớm nhất tới giờ đóng muộn nhất trong tuần của chi nhánh; không có → 08:00–20:00. */
export function gridRange(hours: { openTime: string; closeTime: string }[] | null | undefined): GridRange {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const h of hours ?? []) {
    const o = hhmm(h.openTime);
    const c = hhmm(h.closeTime);
    if (o === null || c === null) continue;
    start = Math.min(start, o);
    end = Math.max(end, c);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return { startMinutes: 8 * 60, endMinutes: 20 * 60 };
  return { startMinutes: Math.floor(start / 60) * 60, endMinutes: Math.ceil(end / 60) * 60 };
}

function hhmm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 24 || mi > 59) return null;
  return h * 60 + mi;
}

/** Các mốc phút của lưới theo bước `slotMinutes`: [start, start+slot, ...) < end. */
export function gridSlots(range: GridRange, slotMinutes: number): number[] {
  const step = slotMinutes > 0 ? slotMinutes : 30;
  const result: number[] = [];
  for (let m = range.startMinutes; m < range.endMinutes; m += step) result.push(m);
  return result;
}

export function minutesToHHmm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export type BlockLayout = { id: string; top: number; height: number };

/**
 * Vị trí khối lịch trên cột ngày: `top`, `height` tính bằng % chiều cao lưới. Khối ngoài khung bị cắt bớt; khối quá ngắn giữ tối thiểu 2% để bấm được.
 */
export function layoutBlocks(
  appointments: { id: string; startAt: string; endAt: string }[],
  range: GridRange,
  timeZone: string,
): BlockLayout[] {
  const total = range.endMinutes - range.startMinutes;
  if (total <= 0) return [];
  const result: BlockLayout[] = [];
  for (const a of appointments) {
    const sameDay = dateKeyOf(a.startAt, timeZone) === dateKeyOf(a.endAt, timeZone);
    const start = Math.max(range.startMinutes, minutesOfDay(a.startAt, timeZone));
    const rawEnd = sameDay ? minutesOfDay(a.endAt, timeZone) : range.endMinutes;
    const end = Math.min(range.endMinutes, rawEnd);
    if (end <= start) continue;
    const top = ((start - range.startMinutes) / total) * 100;
    const height = Math.max(((end - start) / total) * 100, 2);
    result.push({ id: a.id, top: round2(top), height: round2(height) });
  }
  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Tên dịch vụ nối bằng dấu phẩy. */
export function serviceNames(items: { name: string }[]): string {
  return items.map((i) => i.name).join(", ");
}

export type SlotGroup = { startAt: string; staff: { id: string | null; name: string | null }[] };

/** Gom khung giờ trống theo giờ bắt đầu (một giờ có thể nhiều nhân viên rảnh), sắp theo giờ. */
export function groupSlots(slots: { staffMemberId: string | null; staffName: string | null; startAt: string }[]): SlotGroup[] {
  const map = new Map<string, SlotGroup>();
  for (const s of slots) {
    const key = new Date(s.startAt).toISOString();
    let g = map.get(key);
    if (!g) {
      g = { startAt: key, staff: [] };
      map.set(key, g);
    }
    if (!g.staff.some((x) => x.id === s.staffMemberId)) g.staff.push({ id: s.staffMemberId, name: s.staffName });
  }
  return [...map.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Bot đặt, chưa có tóm tắt và mới tạo dưới 5 phút → AI đang viết. */
export function isBriefPending(appointment: { source: string; aiBrief: string | null }, createdAt: string | null | undefined, now: number): boolean {
  if (appointment.aiBrief || appointment.source !== "bot" || !createdAt) return false;
  return now - new Date(createdAt).getTime() < 5 * 60_000;
}

/** Tách lịch của một khách thành sắp tới (tăng dần) và đã qua (mới nhất trước, tối đa `pastLimit`). */
export function splitByNow<T extends { startAt: string }>(appointments: T[], now: number, pastLimit = 5): { upcoming: T[]; past: T[] } {
  const upcoming = appointments.filter((a) => new Date(a.startAt).getTime() >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = appointments
    .filter((a) => new Date(a.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    .slice(0, pastLimit);
  return { upcoming, past };
}
