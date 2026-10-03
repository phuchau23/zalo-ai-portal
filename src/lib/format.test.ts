import { describe, expect, it } from "vitest";
import { formatBytes, formatFieldValue, formatMoney } from "./format";

describe("format", () => {
  it("formats VND", () => {
    expect(formatMoney(450000).replace(/\s/g, " ")).toBe("450.000 đ");
    expect(formatMoney("13000000").replace(/\s/g, " ")).toBe("13.000.000 đ");
    expect(formatMoney(null)).toBe("Liên hệ");
  });

  it("formats field values by type", () => {
    expect(formatFieldValue("money", "490000").replace(/\s/g, " ")).toBe("490.000 đ");
    expect(formatFieldValue("number", "60")).toBe("60");
    expect(formatFieldValue("text", null)).toBe("(trống)");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
