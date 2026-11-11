import { formatMoney } from "@/lib/format";
import { compactVnd } from "@/lib/home";

/** Cách hiện số dùng chung trong Báo cáo: tiền đầy đủ (chú thích), tiền gọn (thẻ, trục), số đếm, %, USD. */
export const money = (n: number) => formatMoney(n);
export const moneyShort = (n: number) => (n === 0 ? "0" : compactVnd(n));
export const count = (n: number) => n.toLocaleString("vi-VN");
export const percentText = (n: number) => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Phần trăm part/total làm tròn 1 chữ số; total 0 → null. */
export function ratio(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}
