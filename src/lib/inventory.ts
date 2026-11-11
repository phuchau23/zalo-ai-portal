/** Nhãn và tính toán thuần cho Kho hàng: tồn, lịch sử xuất nhập, phiếu nhập, kiểm kê, định mức tiêu hao. */

import type { BadgeVariant } from "./customers";

export type MovementKind = "purchase" | "sale" | "return" | "adjust" | "transfer_out" | "transfer_in" | "consume";

export const movementKindLabels: Record<MovementKind, { label: string; variant: BadgeVariant }> = {
  purchase: { label: "Nhập", variant: "success" },
  sale: { label: "Bán", variant: "info" },
  return: { label: "Trả lại", variant: "outline" },
  adjust: { label: "Điều chỉnh", variant: "warning" },
  transfer_out: { label: "Chuyển đi", variant: "secondary" },
  transfer_in: { label: "Chuyển đến", variant: "secondary" },
  consume: { label: "Tiêu hao", variant: "outline" },
};

export function movementKindOf(value: string): { label: string; variant: BadgeVariant } {
  return movementKindLabels[value as MovementKind] ?? { label: value, variant: "outline" };
}

export type PurchaseStatus = "draft" | "received" | "cancelled";

export const purchaseStatusLabels: Record<PurchaseStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Nháp", variant: "warning" },
  received: { label: "Đã nhận", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
};

export function purchaseStatusOf(value: string): { label: string; variant: BadgeVariant } {
  return purchaseStatusLabels[value as PurchaseStatus] ?? { label: value, variant: "outline" };
}

export const countStatusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Chưa áp dụng", variant: "warning" },
  applied: { label: "Đã áp dụng", variant: "success" },
};

export function countStatusOf(value: string): { label: string; variant: BadgeVariant } {
  return countStatusLabels[value] ?? { label: value, variant: "outline" };
}

/** Sắp hết khi có đặt mức tối thiểu và tồn ≤ mức đó. */
export function isLow(quantity: number, minQuantity: number | null | undefined): boolean {
  if (minQuantity === null || minQuantity === undefined) return false;
  return quantity <= minQuantity;
}

/** Giá vốn bình quân gia quyền sau khi nhập thêm `qty` với giá `unitCost`. Tồn ≤ 0 thì lấy giá nhập mới. */
export function avgCostAfter(existingQty: number, avgCost: number, qty: number, unitCost: number): number {
  if (qty <= 0) return avgCost;
  if (existingQty <= 0) return Math.round(unitCost);
  return Math.round((existingQty * avgCost + qty * unitCost) / (existingQty + qty));
}

/** Tổng tiền phiếu nhập từ các dòng. */
export function purchaseTotal(lines: { quantity: number; unitCost: number }[]): number {
  return lines.reduce((sum, l) => sum + Math.max(0, l.quantity) * Math.max(0, l.unitCost), 0);
}

/** Chênh lệch kiểm kê: đếm − sổ sách. */
export function countDelta(line: { expectedQuantity: number; countedQuantity: number }): number {
  return line.countedQuantity - line.expectedQuantity;
}

/** Số lượng có dấu để hiện lịch sử: nhập/chuyển đến/trả lại là +, còn lại là −. */
export function signedQuantity(kind: string, quantity: number): number {
  const positive = kind === "purchase" || kind === "transfer_in" || kind === "return";
  const abs = Math.abs(quantity);
  if (kind === "adjust") return quantity;
  return positive ? abs : -abs;
}

export type InventoryTab = "stock" | "movements" | "purchases" | "transfers" | "counts" | "consumables";

export const inventoryTabs: InventoryTab[] = ["stock", "movements", "purchases", "transfers", "counts", "consumables"];

export function isInventoryTab(value: string | undefined | null): value is InventoryTab {
  return inventoryTabs.includes(value as InventoryTab);
}
