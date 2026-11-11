import { formatMoney } from "@/lib/format";

/** Phạm vi quy tắc hoa hồng (khớp BE: all | service | package | product | item). */
export type CommissionScope = "all" | "service" | "package" | "product" | "item";

export const scopeLabels: Record<CommissionScope, { label: string; hint: string }> = {
  service: { label: "Dịch vụ lẻ", hint: "Tính trên dòng hóa đơn dịch vụ mà nhân viên làm." },
  package: { label: "Buổi trong gói liệu trình", hint: "Tính mỗi khi khách dùng một buổi của gói, cho người làm buổi đó." },
  product: { label: "Sản phẩm bán ra", hint: "Tính trên dòng hóa đơn sản phẩm có gắn nhân viên bán." },
  item: { label: "Một mục cụ thể", hint: "Mức riêng cho một dịch vụ/gói/sản phẩm — ưu tiên cao nhất." },
  all: { label: "Mọi thứ (mặc định)", hint: "Dùng khi không có quy tắc nào cụ thể hơn." },
};

/** Hoa hồng của một khoản: % (làm tròn xuống như BE: cơ sở × % / 100) hoặc số tiền cố định. */
export function commissionAmount(kind: "percent" | "fixed", value: number, basis: number): number {
  return kind === "percent" ? Math.floor((basis * value) / 100) : value;
}

/** "10%" hoặc "50.000 đ". */
export function ruleValueLabel(kind: string, value: number): string {
  return kind === "percent" ? `${value}%` : formatMoney(value);
}

/**
 * Thứ tự ưu tiên khi nhiều quy tắc cùng khớp (giống CommissionService.Resolve ở BE):
 * mục cụ thể → loại (dịch vụ/gói/sản phẩm) → mọi thứ; ở mỗi bậc, quy tắc riêng của nhân viên thắng quy tắc chung.
 * Số nhỏ = ưu tiên cao — dùng để xếp danh sách quy tắc theo đúng thứ tự hệ thống áp dụng.
 */
export function rulePriority(rule: { scope: string; staffMemberId: string | null }): number {
  const level = rule.scope === "item" ? 0 : rule.scope === "all" ? 2 : 1;
  return level * 2 + (rule.staffMemberId ? 0 : 1);
}
