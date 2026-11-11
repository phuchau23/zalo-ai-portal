/**
 * Hàm thuần cho Báo cáo (C6) và Hiệu suất nhân viên (C5): khoảng ngày theo giờ Việt Nam, nhãn kỳ, % thay đổi,
 * thang trục biểu đồ, lưới bản đồ nhiệt. Không gọi API, không đụng DOM → test được bằng vitest.
 * Ngày luôn ở dạng "yyyy-MM-dd" (đúng tham số `from`/`to` của /reports/*).
 */

export type DateRange = { from: string; to: string };
export type PresetKey = "today" | "7d" | "30d" | "90d" | "month" | "lastMonth";
export type GroupBy = "day" | "week" | "month";

const vnDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });

/** Hôm nay theo giờ Việt Nam, "yyyy-MM-dd". */
export function vnToday(now: number): string {
  return vnDay.format(new Date(now));
}

function parse(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cộng/trừ ngày trên chuỗi ngày (không phụ thuộc múi giờ máy). */
export function shiftDays(day: string, days: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Số ngày trong khoảng, tính cả hai đầu. */
export function rangeDays(range: DateRange): number {
  return Math.round((parse(range.to).getTime() - parse(range.from).getTime()) / 86_400_000) + 1;
}

export const presets: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày qua" },
  { key: "30d", label: "30 ngày qua" },
  { key: "month", label: "Tháng này" },
  { key: "lastMonth", label: "Tháng trước" },
  { key: "90d", label: "90 ngày qua" },
];

/** Khoảng ngày của một mốc chọn nhanh ("7 ngày qua" gồm cả hôm nay). */
export function presetRange(key: PresetKey, now: number): DateRange {
  const today = vnToday(now);
  const [y, m] = today.split("-").map(Number);
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: shiftDays(today, -6), to: today };
    case "30d":
      return { from: shiftDays(today, -29), to: today };
    case "90d":
      return { from: shiftDays(today, -89), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "lastMonth": {
      const firstThis = iso(new Date(Date.UTC(y, m - 1, 1)));
      const lastPrev = shiftDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    }
  }
}

/** Khoảng đang chọn trùng mốc nào (để tô sáng nút), không trùng → null ("Tùy chọn"). */
export function matchPreset(range: DateRange, now: number): PresetKey | null {
  return presets.find((p) => {
    const r = presetRange(p.key, now);
    return r.from === range.from && r.to === range.to;
  })?.key ?? null;
}

export function isDay(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value).getTime());
}

/** Khoảng từ URL (?from=&to=); thiếu hoặc sai → mốc mặc định. Đảo ngược nếu from > to. */
export function rangeFromQuery(from: string | null, to: string | null, fallback: DateRange): DateRange {
  if (!isDay(from) || !isDay(to)) return fallback;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Gộp theo ngày khi ≤ 45 ngày, theo tuần khi ≤ 200 ngày, còn lại theo tháng — biểu đồ luôn dễ đọc (không quá ~45 điểm). */
export function suggestedGroupBy(range: DateRange): GroupBy {
  const days = rangeDays(range);
  if (days <= 45) return "day";
  if (days <= 200) return "week";
  return "month";
}

/** "2026-11-03" → "03/11"; tuần (ngày đầu tuần) → "03/11"; tháng "2026-11" → "T11/26". */
export function periodLabel(period: string, groupBy: GroupBy): string {
  if (groupBy === "month") {
    const [y, m] = period.split("-");
    return `T${Number(m)}/${y.slice(2)}`;
  }
  const [, m, d] = period.split("-");
  return `${d}/${m}`;
}

/** Nhãn đầy đủ cho chú thích khi rê chuột: "Thứ ba, 03/11/2026" · "Tuần từ 03/11/2026" · "Tháng 11/2026". */
export function periodLongLabel(period: string, groupBy: GroupBy): string {
  if (groupBy === "month") {
    const [y, m] = period.split("-");
    return `Tháng ${Number(m)}/${y}`;
  }
  const [y, m, d] = period.split("-");
  if (groupBy === "week") return `Tuần từ ${d}/${m}/${y}`;
  const weekday = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][parse(period).getUTCDay()];
  return `${weekday}, ${d}/${m}/${y}`;
}

/** "08/10 – 06/11/2026"; cùng một ngày → "06/11/2026". */
export function rangeLabel(range: DateRange): string {
  const [fy, fm, fd] = range.from.split("-");
  const [ty, tm, td] = range.to.split("-");
  if (range.from === range.to) return `${td}/${tm}/${ty}`;
  return fy === ty ? `${fd}/${fm} – ${td}/${tm}/${ty}` : `${fd}/${fm}/${fy} – ${td}/${tm}/${ty}`;
}

/** Khoảng liền trước, cùng độ dài (để so sánh "so với kỳ trước"). */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  return { from: shiftDays(range.from, -days), to: shiftDays(range.from, -1) };
}

/** % thay đổi so với kỳ trước, làm tròn 1 chữ số; kỳ trước = 0 → null (không so được). */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Tỷ lệ % từng mục trên tổng (tổng 0 → 0), làm tròn 1 chữ số. */
export function shares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  return values.map((v) => (total === 0 ? 0 : Math.round((Math.max(0, v) / total) * 1000) / 10));
}

/**
 * Thang trục dọc "đẹp": bước là 1, 2, 2.5 hoặc 5 × 10^n, đỉnh trục ≥ giá trị lớn nhất.
 * max ≤ 0 → thang 0..4 (trục vẫn có vạch khi chưa có dữ liệu).
 */
export function niceScale(max: number, tickCount = 4): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: tickCount, ticks: Array.from({ length: tickCount + 1 }, (_, i) => i) };
  const raw = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks };
}

/** Chỉ số các nhãn trục ngang nên hiện để không chồng nhau: luôn có điểm đầu và cuối. */
export function tickIndexes(count: number, maxLabels: number): number[] {
  if (count <= 0) return [];
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const out: number[] = [];
  for (let i = 0; i < count - 1; i += step) out.push(i);
  if (count - 1 - out[out.length - 1] < step / 2 && out.length > 1) out.pop();
  out.push(count - 1);
  return out;
}

/** Thứ tự hiển thị thứ trong tuần: T2 → CN (DayOfWeek của .NET: 0 = Chủ nhật). */
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0] as const;
export const weekdayShort = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
export const weekdayLong = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"] as const;

export type HeatmapGrid = { hours: number[]; rows: { day: number; values: number[] }[]; max: number; total: number };

/**
 * Lưới bản đồ nhiệt thứ × giờ từ các ô có lịch. Giờ hiển thị: từ giờ sớm nhất đến muộn nhất có lịch,
 * nhưng ít nhất 8h–20h (giờ mở cửa phổ biến) để lưới không bị co lại khi ít dữ liệu.
 */
export function heatmapGrid(cells: { day: number; hour: number; appointments: number }[]): HeatmapGrid {
  const busy = cells.filter((c) => c.appointments > 0);
  const first = Math.min(8, ...busy.map((c) => c.hour));
  const last = Math.max(20, ...busy.map((c) => c.hour));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const lookup = new Map(cells.map((c) => [`${c.day}:${c.hour}`, c.appointments]));
  const rows = weekdayOrder.map((day) => ({ day, values: hours.map((h) => lookup.get(`${day}:${h}`) ?? 0) }));
  const all = rows.flatMap((r) => r.values);
  return { hours, rows, max: Math.max(0, ...all), total: all.reduce((s, v) => s + v, 0) };
}

/** Mức đậm 0..4 của một ô bản đồ nhiệt (0 = trống). */
export function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as 1 | 2 | 3 | 4;
}

/** Kỳ tháng "yyyy-MM" theo giờ Việt Nam. */
export function monthKey(now: number): string {
  return vnToday(now).slice(0, 7);
}

export function shiftMonth(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

/** Số phút giữa hai thời điểm ISO; chưa kết thúc → tính đến `now`. */
export function minutesBetween(startIso: string, endIso: string | null, now: number): number {
  const end = endIso ? new Date(endIso).getTime() : now;
  return Math.max(0, Math.round((end - new Date(startIso).getTime()) / 60_000));
}

/** 450 → "7 giờ 30 phút"; 45 → "45 phút"; 120 → "2 giờ". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

/** Đồng hồ đếm trong ca: "02:05:09". */
export function clockLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Số giờ thập phân gọn: 7.5 → "7,5 giờ". */
export function hoursLabel(hours: number): string {
  return `${hours.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;
}

/** Sắp xếp ổn định theo một cột số hoặc chữ (chữ so theo tiếng Việt). */
export function sortBy<T>(rows: T[], key: (row: T) => number | string, direction: "asc" | "desc"): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const x = key(a.row);
      const y = key(b.row);
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "vi");
      return cmp === 0 ? a.index - b.index : cmp * factor;
    })
    .map((r) => r.row);
}
