import { describe, expect, it } from "vitest";
import { compactVnd, firstName, greeting, longDateVn, percent, setupProgress, vnHour } from "./home";

describe("greeting", () => {
  it.each([
    [4, "Chào buổi sáng"],
    [10, "Chào buổi sáng"],
    [11, "Chào buổi trưa"],
    [13, "Chào buổi chiều"],
    [17, "Chào buổi chiều"],
    [18, "Chào buổi tối"],
    [2, "Chào buổi tối"],
  ])("%i giờ → %s", (hour, expected) => {
    expect(greeting(hour)).toBe(expected);
  });
});

describe("vnHour & longDateVn", () => {
  it("dùng giờ Việt Nam (UTC+7)", () => {
    const at = Date.UTC(2026, 10, 1, 10, 30); // 17:30 giờ VN
    expect(vnHour(at)).toBe(17);
    expect(longDateVn(at)).toBe("Chủ Nhật, 01/11/2026");
  });
});

describe("firstName", () => {
  it("lấy tên cuối", () => {
    expect(firstName("Nguyễn Thị Lan")).toBe("Lan");
    expect(firstName("  Hương ")).toBe("Hương");
  });
  it("tên dài hơn 4 chữ (không phải họ tên) giữ nguyên", () => {
    expect(firstName("Chủ Khoa Học Huyệt Đạo")).toBe("Chủ Khoa Học Huyệt Đạo");
  });
});

describe("percent", () => {
  it("tổng 0 → null", () => expect(percent(0, 0)).toBeNull());
  it("làm tròn", () => expect(percent(2, 3)).toBe(67));
});

describe("setupProgress", () => {
  const step = (key: string, done: boolean) => ({ key, title: key, description: "", href: "/", done });
  it("đếm bước xong và chọn bước tiếp theo", () => {
    expect(setupProgress([step("a", true), step("b", false), step("c", false)])).toMatchObject({ done: 1, total: 3, next: { key: "b" } });
  });
  it("xong hết → không còn bước tiếp", () => {
    expect(setupProgress([step("a", true)]).next).toBeNull();
  });
});

describe("compactVnd", () => {
  it.each([
    [850_000, "850.000 đ"],
    [1_250_000, "1,25 tr"],
    [12_500_000, "12,5 tr"],
    [250_000_000, "250 tr"],
    [1_500_000_000, "1,5 tỷ"],
  ])("%i → %s", (value, expected) => {
    expect(compactVnd(value)).toBe(expected);
  });
});
