/** Nhãn, kiểm tra và tính toán thuần dùng chung cho CRM: chi nhánh, danh mục bán, nhân viên & ca làm, quyền. */

import type { BadgeVariant } from "./customers";

/** Nhãn + gợi ý ngắn cho từng mã quyền. Danh sách mã lấy từ BE (GET /tenant/crm-settings → allPermissions). */
export const permissionLabels: Record<string, { label: string; hint: string }> = {
  view_company_revenue: { label: "Xem doanh thu toàn công ty", hint: "Thấy doanh thu của mọi chi nhánh, không chỉ chi nhánh mình." },
  view_all_branches: { label: "Xem mọi chi nhánh", hint: "Xem lịch, khách, hóa đơn ở chi nhánh khác." },
  manage_catalog: { label: "Quản lý danh mục bán", hint: "Thêm, sửa giá dịch vụ, gói, sản phẩm." },
  manage_staff: { label: "Quản lý nhân viên & ca làm", hint: "Thêm nhân viên, xếp ca, duyệt nghỉ phép." },
  manage_branches: { label: "Quản lý chi nhánh", hint: "Thêm chi nhánh, giờ mở cửa, ngày nghỉ." },
  apply_discount_over_limit: { label: "Giảm giá vượt mức", hint: "Giảm nhiều hơn mức chủ doanh nghiệp cho phép." },
  void_invoice: { label: "Hủy hóa đơn", hint: "Hủy hóa đơn đã lập." },
  refund: { label: "Hoàn tiền", hint: "Trả lại tiền cho khách." },
  export_data: { label: "Xuất dữ liệu", hint: "Tải danh sách khách, báo cáo ra Excel." },
  delete_customer: { label: "Xóa khách hàng", hint: "Xóa hồ sơ và lịch sử của một khách." },
  manage_inventory: { label: "Quản lý kho", hint: "Nhập, xuất, kiểm kê sản phẩm." },
  view_reports: { label: "Xem báo cáo", hint: "Xem thống kê doanh thu, lịch hẹn, khách." },
};

export function permissionLabel(code: string): string {
  return permissionLabels[code]?.label ?? code;
}

/** "3 quyền" / "Chưa có quyền thêm" — chủ doanh nghiệp luôn toàn quyền. */
export function permissionSummary(role: string, permissions: string[]): string {
  if (role === "owner") return "Toàn quyền";
  const n = permissions.length;
  return n === 0 ? "Chưa có quyền thêm" : `${n} quyền`;
}

/** Chủ doanh nghiệp luôn được; người khác phải có mã quyền trong danh sách. */
export function hasPermission(tenant: { role: string; permissions?: string[] | null } | null | undefined, code: string): boolean {
  if (!tenant) return false;
  if (tenant.role === "owner") return true;
  return (tenant.permissions ?? []).includes(code);
}

/** Thứ trong tuần theo quy ước BE: 0 = Chủ nhật. */
export const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

export const dayLongNames = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"] as const;

/** Thứ tự hiển thị: T2 → CN (người Việt quen tuần bắt đầu thứ hai). */
export const dayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export type CatalogKind = "service" | "package" | "product";

export const catalogKinds: CatalogKind[] = ["service", "package", "product"];

export const kindLabels: Record<CatalogKind, string> = {
  service: "Dịch vụ",
  package: "Gói liệu trình",
  product: "Sản phẩm",
};

export function isCatalogKind(value: string | undefined | null): value is CatalogKind {
  return value === "service" || value === "package" || value === "product";
}

/** "HH:mm" 24 giờ. */
export function isHHmm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Phút từ 00:00; chuỗi sai → null. */
export function hhmmToMinutes(value: string): number | null {
  if (!isHHmm(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Khung giờ hợp lệ khi cả hai đúng định dạng và mở < đóng. */
export function isValidWindow(start: string, end: string): boolean {
  const a = hhmmToMinutes(start);
  const b = hhmmToMinutes(end);
  return a !== null && b !== null && a < b;
}

/** Hai khung giờ trong cùng ngày có chồng lên nhau không (chạm đầu-cuối thì không tính). */
export function windowsOverlap(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  const a1 = hhmmToMinutes(a.start) ?? 0;
  const a2 = hhmmToMinutes(a.end) ?? 0;
  const b1 = hhmmToMinutes(b.start) ?? 0;
  const b2 = hhmmToMinutes(b.end) ?? 0;
  return a1 < b2 && b1 < a2;
}

export type DayWindow = { dayOfWeek: number; start: string; end: string };

/** Gom các khung giờ theo thứ (0..6), mỗi ngày sắp theo giờ mở. Ngày không có khung → mảng rỗng. */
export function groupHoursByDay<T extends { dayOfWeek: number }>(rows: T[]): Record<number, T[]> {
  const result: Record<number, T[]> = {};
  for (let d = 0; d < 7; d++) result[d] = [];
  for (const row of rows) {
    if (row.dayOfWeek < 0 || row.dayOfWeek > 6) continue;
    result[row.dayOfWeek].push(row);
  }
  for (let d = 0; d < 7; d++) {
    result[d].sort((a, b) => startOf(a).localeCompare(startOf(b)));
  }
  return result;
}

function startOf(row: { dayOfWeek: number }): string {
  const r = row as { openTime?: string; startTime?: string; start?: string };
  return r.openTime ?? r.startTime ?? r.start ?? "";
}

/** Lỗi đầu tiên trong danh sách khung giờ (theo ngày): sai định dạng, mở ≥ đóng, hoặc chồng nhau. null = hợp lệ. */
export function validateWindows(rows: DayWindow[]): string | null {
  for (const row of rows) {
    if (!isHHmm(row.start) || !isHHmm(row.end)) return `${dayNames[row.dayOfWeek] ?? "?"}: giờ phải theo dạng HH:mm.`;
    if (!isValidWindow(row.start, row.end)) return `${dayNames[row.dayOfWeek] ?? "?"}: giờ bắt đầu phải trước giờ kết thúc.`;
  }
  const byDay = groupHoursByDay(rows);
  for (const d of dayOrder) {
    const list = byDay[d];
    for (let i = 1; i < list.length; i++) {
      if (windowsOverlap(list[i - 1], list[i])) return `${dayNames[d]}: các khung giờ chồng lên nhau.`;
    }
  }
  return null;
}

/** "60 phút", "5 buổi · 90 phút/buổi" … theo loại mục. */
export function formatDurationLabel(item: {
  kind: string;
  durationMinutes?: number | null;
  sessionCount?: number | null;
  validityDays?: number | null;
}): string {
  const parts: string[] = [];
  if (item.kind === "package") {
    if (item.sessionCount) parts.push(`${item.sessionCount} buổi`);
    if (item.durationMinutes) parts.push(`${item.durationMinutes} phút/buổi`);
    if (item.validityDays) parts.push(`hạn ${item.validityDays} ngày`);
  } else if (item.kind === "service") {
    if (item.durationMinutes) parts.push(`${item.durationMinutes} phút`);
  }
  return parts.join(" · ");
}

export const branchStatusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: "Đang hoạt động", variant: "success" },
  inactive: { label: "Ngừng hoạt động", variant: "secondary" },
};

export const staffStatusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  active: { label: "Đang làm", variant: "success" },
  inactive: { label: "Đã nghỉ", variant: "secondary" },
};

export function statusOf(map: Record<string, { label: string; variant: BadgeVariant }>, value: string) {
  return map[value] ?? { label: value, variant: "outline" as const };
}

/** Mã danh mục: chữ in hoa không dấu, số, gạch ngang/gạch dưới; ví dụ DV-MASSAGE-60. */
export function normalizeCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
}

/** Chuỗi ô nhập số → number | null (trống → null, không phải số → null). */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Chuỗi rỗng → null, có chữ → trim. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** "2026-10-15T09:30" (datetime-local) → ISO có múi giờ của trình duyệt; sai → null. */
export function localToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Tên chi nhánh theo id; không có → "Mọi chi nhánh" (null) hoặc "(không rõ)". */
export function branchName(branches: { id: string; name: string }[] | undefined, id: string | null | undefined): string {
  if (!id) return "Mọi chi nhánh";
  return branches?.find((b) => b.id === id)?.name ?? "(không rõ)";
}
