/** Nhãn, kiểm tra và tính toán thuần cho Bán hàng: hóa đơn, thanh toán, gói liệu trình, thẻ trả trước, voucher, ca thu ngân. */

import type { BadgeVariant } from "./customers";
import { formatMoney } from "./format";

export type InvoiceStatus = "open" | "partial" | "paid" | "void" | "refunded";

export const invoiceStatuses: InvoiceStatus[] = ["open", "partial", "paid", "void", "refunded"];

export const invoiceStatusLabels: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: "Chưa thu", variant: "warning" },
  partial: { label: "Thu một phần", variant: "info" },
  paid: { label: "Đã thanh toán", variant: "success" },
  void: { label: "Đã hủy", variant: "secondary" },
  refunded: { label: "Đã hoàn tiền", variant: "outline" },
};

export function invoiceStatusOf(value: string): { label: string; variant: BadgeVariant } {
  return invoiceStatusLabels[value as InvoiceStatus] ?? { label: value, variant: "outline" };
}

export type PaymentMethod = "cash" | "transfer" | "card" | "wallet";

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "wallet", label: "Thẻ trả trước" },
];

export const paymentMethodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  wallet: "Thẻ trả trước",
  refund: "Hoàn tiền",
};

export function paymentMethodLabel(value: string): string {
  return paymentMethodLabels[value] ?? value;
}

export const refundMethods: { value: "cash" | "transfer" | "wallet"; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "wallet", label: "Vào thẻ trả trước" },
];

export type LineKind = "service" | "package" | "product" | "redemption" | "custom";

export const lineKindLabels: Record<string, string> = {
  service: "Dịch vụ",
  package: "Gói liệu trình",
  product: "Sản phẩm",
  redemption: "Dùng buổi gói",
  custom: "Tự nhập",
};

export function lineKindLabel(value: string): string {
  return lineKindLabels[value] ?? value;
}

export type LineAmounts = { quantity: number; unitPrice: number; discount: number };

/** Tiền một dòng: số lượng × đơn giá − giảm dòng, không âm. */
export function lineTotal(line: LineAmounts): number {
  const gross = Math.max(0, Math.trunc(line.quantity)) * Math.max(0, line.unitPrice);
  return Math.max(0, gross - Math.max(0, line.discount));
}

/** Tạm tính, giảm hóa đơn, voucher → tổng phải thu (không âm). Giảm vượt tạm tính thì cắt về 0. */
export function computeTotals(lines: LineAmounts[], discount = 0, voucher = 0): { subtotal: number; discount: number; voucher: number; total: number } {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const d = Math.min(Math.max(0, discount), subtotal);
  const v = Math.min(Math.max(0, voucher), subtotal - d);
  return { subtotal, discount: d, voucher: v, total: subtotal - d - v };
}

/** Chỉ sửa dòng khi hóa đơn chưa thu đồng nào. */
export function invoiceCanEdit(status: string): boolean {
  return status === "open";
}

export type InvoiceAction = "edit" | "discount" | "pay" | "close_zero" | "receipt" | "void" | "refund";

export type InvoicePermissions = { canVoid: boolean; canRefund: boolean };

/**
 * Thao tác hợp lệ theo trạng thái + quyền. `total` và `due` quyết định "Chốt (0 đ)" và "Thu tiền".
 * Quyền hủy/hoàn tiền chỉ để ẩn nút; BE vẫn kiểm (403).
 */
export function nextInvoiceActions(
  status: string,
  permissions: InvoicePermissions,
  amounts: { total: number; due: number; paidAmount: number } = { total: 1, due: 1, paidAmount: 0 },
): InvoiceAction[] {
  const actions: InvoiceAction[] = [];
  if (status === "open") {
    actions.push("edit", "discount");
    if (amounts.total === 0) actions.push("close_zero");
  }
  if ((status === "open" || status === "partial") && amounts.due > 0) actions.push("pay");
  if (status === "paid" || status === "partial" || status === "refunded") actions.push("receipt");
  if ((status === "open" || status === "partial" || status === "paid") && permissions.canVoid) actions.push("void");
  if ((status === "partial" || status === "paid") && amounts.paidAmount > 0 && permissions.canRefund) actions.push("refund");
  return actions;
}

export type PackageStatus = "active" | "paused" | "expired" | "exhausted" | "transferred" | "cancelled";

export const packageStatusLabels: Record<PackageStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Còn hiệu lực", variant: "success" },
  paused: { label: "Bảo lưu", variant: "warning" },
  expired: { label: "Hết hạn", variant: "secondary" },
  exhausted: { label: "Đã dùng hết", variant: "secondary" },
  transferred: { label: "Đã chuyển nhượng", variant: "outline" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

export function packageStatusOf(value: string): { label: string; variant: BadgeVariant } {
  return packageStatusLabels[value as PackageStatus] ?? { label: value, variant: "outline" };
}

/** Thao tác đổi trạng thái gói: còn hiệu lực ↔ bảo lưu; hủy khi còn hiệu lực hoặc bảo lưu. */
export function packageStatusActions(status: string): { status: "active" | "paused" | "cancelled"; label: string }[] {
  if (status === "active") {
    return [
      { status: "paused", label: "Bảo lưu" },
      { status: "cancelled", label: "Hủy gói" },
    ];
  }
  if (status === "paused") {
    return [
      { status: "active", label: "Kích hoạt lại" },
      { status: "cancelled", label: "Hủy gói" },
    ];
  }
  return [];
}

export const walletKindLabels: Record<string, string> = {
  topup: "Nạp tiền",
  bonus: "Tặng thêm",
  payment: "Thanh toán",
  refund: "Hoàn vào thẻ",
  adjust: "Điều chỉnh",
};

export function walletKindLabel(value: string): string {
  return walletKindLabels[value] ?? value;
}

export type VoucherKind = "percent" | "amount";

/** "10% (tối đa 50.000 đ)" hoặc "50.000 đ". */
export function voucherValueLabel(voucher: { kind: string; value: number; maxDiscount?: number | null }): string {
  if (voucher.kind === "percent") {
    const cap = voucher.maxDiscount ? ` (tối đa ${formatMoney(voucher.maxDiscount)})` : "";
    return `${voucher.value}%${cap}`;
  }
  return formatMoney(voucher.value);
}

/** Voucher còn dùng được lúc `now`: đang bật, trong thời hạn, chưa hết lượt. */
export function voucherIsUsable(
  voucher: { isActive: boolean; validFrom?: string | null; validTo?: string | null; maxUses?: number | null; usedCount: number },
  now = Date.now(),
): boolean {
  if (!voucher.isActive) return false;
  if (voucher.validFrom && new Date(voucher.validFrom).getTime() > now) return false;
  if (voucher.validTo && new Date(voucher.validTo).getTime() < now) return false;
  if (voucher.maxUses !== null && voucher.maxUses !== undefined && voucher.usedCount >= voucher.maxUses) return false;
  return true;
}

/** Chênh lệch khi chốt ca: đếm − dự kiến (dương = thừa, âm = thiếu). */
export function shiftDifference(expected: number | null | undefined, counted: number | null | undefined): number | null {
  if (expected === null || expected === undefined || counted === null || counted === undefined) return null;
  return counted - expected;
}

/** Ngân hàng phổ biến (tên → mã BIN theo chuẩn VietQR/NAPAS). "Khác" nhập BIN tay. */
export const banks: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970422", name: "MB" },
  { bin: "970416", name: "ACB" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970432", name: "VPBank" },
  { bin: "970405", name: "Agribank" },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970448", name: "OCB" },
  { bin: "970426", name: "MSB" },
];

export function bankNameOf(bin: string): string | null {
  return banks.find((b) => b.bin === bin)?.name ?? null;
}

/** Mã BIN ngân hàng: 6 chữ số. */
export function isBankBin(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

const qty = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

/** Số lượng (có thể lẻ): 2 → "2", 1.5 → "1,5". */
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return qty.format(value);
}

/** Chuỗi ô nhập tiền → số nguyên không âm; trống/sai → null. Chấp nhận dấu chấm/phẩy phân cách nghìn. */
export function parseMoney(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Chuỗi ô nhập số lượng → số (cho phép lẻ, dấu phẩy thập phân kiểu Việt); trống/sai → null. */
export function parseQty(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Khoảng ngày mặc định cho danh sách hóa đơn: `days` ngày gần nhất, dạng "YYYY-MM-DD". */
export function defaultDateRange(days = 30, now = Date.now()): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** "YYYY-MM-DD" → ISO đầu ngày / đầu ngày hôm sau (múi giờ trình duyệt) để lọc `from`/`to`. */
export function dateRangeToIso(from: string, to: string): { from: string | undefined; to: string | undefined } {
  const start = from ? new Date(`${from}T00:00`) : null;
  const end = to ? new Date(new Date(`${to}T00:00`).getTime() + 24 * 60 * 60 * 1000) : null;
  return {
    from: start && !Number.isNaN(start.getTime()) ? start.toISOString() : undefined,
    to: end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
  };
}

export type SalesTab = "invoices" | "shift" | "vouchers";

export function isSalesTab(value: string | undefined | null): value is SalesTab {
  return value === "invoices" || value === "shift" || value === "vouchers";
}
