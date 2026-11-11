import { describe, expect, it } from "vitest";
import { readParams, tabForAnswer, toQuery } from "./report-params";

const now = Date.UTC(2026, 10, 6, 3, 0); // 06/11/2026 10:00 giờ VN

describe("tham số trang Báo cáo", () => {
  it("mặc định: tổng quan, 30 ngày qua, gộp theo ngày", () => {
    const p = readParams(new URLSearchParams(""), now);
    expect(p).toEqual({ tab: "overview", range: { from: "2026-10-08", to: "2026-11-06" }, branchId: null, groupBy: "day" });
  });

  it("đọc tab, khoảng, chi nhánh; tab lạ về tổng quan", () => {
    const p = readParams(new URLSearchParams("tab=revenue&from=2026-08-01&to=2026-11-06&branch=b1"), now);
    expect(p.tab).toBe("revenue");
    expect(p.groupBy).toBe("week");
    expect(p.branchId).toBe("b1");
    expect(readParams(new URLSearchParams("tab=xyz"), now).tab).toBe("overview");
  });

  it("đi vòng URL giữ nguyên tham số, bỏ group khi trùng mặc định", () => {
    const p = readParams(new URLSearchParams("tab=customers&from=2026-11-01&to=2026-11-06&group=week"), now);
    expect(readParams(new URLSearchParams(toQuery(p)), now)).toEqual(p);
    expect(toQuery({ ...p, groupBy: "day" })).not.toContain("group");
  });

  it("câu trả lời của Hỏi số liệu mở đúng tab", () => {
    expect(tabForAnswer("outstanding")).toBe("debt");
    expect(tabForAnswer("staff")).toBe("staff");
    expect(tabForAnswer(null)).toBeNull();
  });
});
