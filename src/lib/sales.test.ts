import { describe, expect, it } from "vitest";
import {
  bankNameOf,
  computeTotals,
  dateRangeToIso,
  defaultDateRange,
  formatQty,
  invoiceCanEdit,
  invoiceStatusOf,
  isBankBin,
  lineKindLabel,
  lineTotal,
  nextInvoiceActions,
  packageStatusActions,
  packageStatusOf,
  parseMoney,
  parseQty,
  paymentMethodLabel,
  shiftDifference,
  voucherIsUsable,
  voucherValueLabel,
  walletKindLabel,
} from "./sales";

const plain = (s: string) => s.replace(/\s/g, " ");

describe("labels", () => {
  it("maps invoice status, payment method, line kind", () => {
    expect(invoiceStatusOf("paid")).toEqual({ label: "Đã thanh toán", variant: "success" });
    expect(invoiceStatusOf("weird")).toEqual({ label: "weird", variant: "outline" });
    expect(paymentMethodLabel("wallet")).toBe("Thẻ trả trước");
    expect(paymentMethodLabel("refund")).toBe("Hoàn tiền");
    expect(lineKindLabel("redemption")).toBe("Dùng buổi gói");
    expect(walletKindLabel("topup")).toBe("Nạp tiền");
    expect(packageStatusOf("paused").label).toBe("Bảo lưu");
  });
});

describe("totals", () => {
  it("computes line total without going negative", () => {
    expect(lineTotal({ quantity: 2, unitPrice: 100_000, discount: 50_000 })).toBe(150_000);
    expect(lineTotal({ quantity: 1, unitPrice: 100_000, discount: 500_000 })).toBe(0);
  });

  it("caps invoice discount and voucher at the subtotal", () => {
    const lines = [
      { quantity: 1, unitPrice: 300_000, discount: 0 },
      { quantity: 2, unitPrice: 100_000, discount: 20_000 },
    ];
    expect(computeTotals(lines, 50_000, 30_000)).toEqual({ subtotal: 480_000, discount: 50_000, voucher: 30_000, total: 400_000 });
    expect(computeTotals(lines, 1_000_000, 10_000)).toEqual({ subtotal: 480_000, discount: 480_000, voucher: 0, total: 0 });
    expect(computeTotals([])).toEqual({ subtotal: 0, discount: 0, voucher: 0, total: 0 });
  });
});

describe("invoice actions", () => {
  const all = { canVoid: true, canRefund: true };
  const none = { canVoid: false, canRefund: false };

  it("only open invoices are editable", () => {
    expect(invoiceCanEdit("open")).toBe(true);
    expect(invoiceCanEdit("partial")).toBe(false);
  });

  it("lists actions by status", () => {
    expect(nextInvoiceActions("open", all, { total: 500_000, due: 500_000, paidAmount: 0 })).toEqual(["edit", "discount", "pay", "void"]);
    expect(nextInvoiceActions("open", all, { total: 0, due: 0, paidAmount: 0 })).toEqual(["edit", "discount", "close_zero", "void"]);
    expect(nextInvoiceActions("partial", all, { total: 500_000, due: 200_000, paidAmount: 300_000 })).toEqual(["pay", "receipt", "void", "refund"]);
    expect(nextInvoiceActions("paid", all, { total: 500_000, due: 0, paidAmount: 500_000 })).toEqual(["receipt", "void", "refund"]);
    expect(nextInvoiceActions("void", all)).toEqual([]);
    expect(nextInvoiceActions("refunded", all, { total: 500_000, due: 0, paidAmount: 500_000 })).toEqual(["receipt"]);
  });

  it("hides void/refund without permission", () => {
    expect(nextInvoiceActions("paid", none, { total: 500_000, due: 0, paidAmount: 500_000 })).toEqual(["receipt"]);
  });
});

describe("packages", () => {
  it("offers pause/cancel for active and reactivate for paused", () => {
    expect(packageStatusActions("active").map((a) => a.status)).toEqual(["paused", "cancelled"]);
    expect(packageStatusActions("paused").map((a) => a.status)).toEqual(["active", "cancelled"]);
    expect(packageStatusActions("expired")).toEqual([]);
  });
});

describe("vouchers", () => {
  it("formats value by kind", () => {
    expect(plain(voucherValueLabel({ kind: "percent", value: 10, maxDiscount: 50_000 }))).toBe("10% (tối đa 50.000 đ)");
    expect(voucherValueLabel({ kind: "percent", value: 10, maxDiscount: null })).toBe("10%");
    expect(plain(voucherValueLabel({ kind: "amount", value: 20_000 }))).toBe("20.000 đ");
  });

  it("checks usability by active flag, dates and uses", () => {
    const now = Date.parse("2026-10-15T00:00:00Z");
    const base = { isActive: true, validFrom: null, validTo: null, maxUses: null, usedCount: 0 };
    expect(voucherIsUsable(base, now)).toBe(true);
    expect(voucherIsUsable({ ...base, isActive: false }, now)).toBe(false);
    expect(voucherIsUsable({ ...base, validFrom: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(voucherIsUsable({ ...base, validTo: "2026-10-01T00:00:00Z" }, now)).toBe(false);
    expect(voucherIsUsable({ ...base, maxUses: 3, usedCount: 3 }, now)).toBe(false);
    expect(voucherIsUsable({ ...base, maxUses: 3, usedCount: 2 }, now)).toBe(true);
  });
});

describe("cash shift", () => {
  it("returns counted minus expected, null when unknown", () => {
    expect(shiftDifference(1_000_000, 950_000)).toBe(-50_000);
    expect(shiftDifference(null, 1)).toBeNull();
  });
});

describe("banks and inputs", () => {
  it("maps BIN to bank name and validates BIN", () => {
    expect(bankNameOf("970436")).toBe("Vietcombank");
    expect(bankNameOf("000000")).toBeNull();
    expect(isBankBin("970407")).toBe(true);
    expect(isBankBin("97040")).toBe(false);
  });

  it("formats and parses quantities and money", () => {
    expect(formatQty(2)).toBe("2");
    expect(formatQty(1.5)).toBe("1,5");
    expect(formatQty(null)).toBe("—");
    expect(parseQty("1,5")).toBe(1.5);
    expect(parseQty("")).toBeNull();
    expect(parseMoney("1.500.000")).toBe(1_500_000);
    expect(parseMoney("abc")).toBeNull();
  });

  it("builds default range and converts to ISO", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    const range = defaultDateRange(30, now);
    expect(range.to).toBe("2026-10-15");
    expect(range.from).toBe("2026-09-15");
    const iso = dateRangeToIso("2026-10-01", "2026-10-15");
    expect(iso.from && new Date(iso.from).getTime()).toBe(new Date("2026-10-01T00:00").getTime());
    expect(iso.to && new Date(iso.to).getTime()).toBe(new Date("2026-10-16T00:00").getTime());
    expect(dateRangeToIso("", "")).toEqual({ from: undefined, to: undefined });
  });
});
