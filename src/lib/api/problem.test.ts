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

  it("translates CRM codes", () => {
    expect(problemMessage(toProblem({ code: "duplicate_code", title: "Duplicate" }, 409))).toBe("Mã này đã được dùng.");
    expect(problemMessage(toProblem({ code: "default_branch" }, 409))).toBe("Hãy đặt chi nhánh khác làm mặc định trước.");
    expect(problemMessage(toProblem({ code: "branch_inactive" }, 409))).toBe("Chi nhánh đang ngừng hoạt động.");
    expect(problemMessage(toProblem({ code: "duplicate_closure" }, 409))).toBe("Ngày này đã có trong danh sách nghỉ.");
    expect(problemMessage(toProblem({ code: "user_already_linked" }, 409))).toBe("Tài khoản này đã gắn với nhân viên khác.");
    expect(problemMessage(toProblem({ code: "code_kind_mismatch" }, 400))).toBe("Mã này đang dùng cho loại mục khác trong Kho kiến thức.");
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
