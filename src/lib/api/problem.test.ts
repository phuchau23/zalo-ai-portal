import { describe, expect, it } from "vitest";
import { problemMessage, toProblem } from "./problem";

describe("toProblem", () => {
  it("reads code, title and first error per field", () => {
    const problem = toProblem(
      {
        title: "Dữ liệu không hợp lệ.",
        code: "validation_failed",
        errors: { name: ["Không được để trống.", "Quá dài."], privacyUrl: ["Phải là https."] },
      },
      400,
    );

    expect(problem).toMatchObject({
      status: 400,
      code: "validation_failed",
      title: "Dữ liệu không hợp lệ.",
      fieldErrors: { name: "Không được để trống.", privacyUrl: "Phải là https." },
    });
  });

  it("falls back to internal_error for 5xx without body", () => {
    expect(toProblem(undefined, 502).code).toBe("internal_error");
  });

  it("ignores malformed errors", () => {
    expect(toProblem({ errors: { name: "not-an-array" } }, 400).fieldErrors).toEqual({});
  });
});

describe("problemMessage", () => {
  it("uses translated message for known codes", () => {
    expect(problemMessage(toProblem({ code: "rate_limited" }, 429))).toContain("đợi một phút");
  });

  it("uses BE title for unknown codes", () => {
    expect(problemMessage(toProblem({ code: "new_code", title: "Câu từ BE" }, 409))).toBe("Câu từ BE");
  });
});

describe("fileErrors", () => {
  it("reads located file errors", () => {
    const problem = toProblem(
      {
        code: "invalid_file",
        title: "File có 1 lỗi",
        fileErrors: [{ location: "Dịch vụ", row: 5, column: "Giá (VNĐ)", message: "Giá phải là số" }, "rác"],
      },
      400,
    );

    expect(problem.fileErrors).toEqual([{ location: "Dịch vụ", row: 5, column: "Giá (VNĐ)", message: "Giá phải là số" }]);
    expect(problemMessage(problem)).toBe("File có 1 lỗi");
  });
});
