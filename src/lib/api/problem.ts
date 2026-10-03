/**
 * Lỗi từ BE theo chuẩn ProblemDetails, kèm `code` ổn định (xem DECISIONS.md, M1 bước 4).
 * OpenAPI không mô tả trường `code`/`errors` mở rộng, nên đọc an toàn từ `unknown`.
 */
export type ApiProblem = {
  status: number;
  code: string;
  title?: string;
  /** Lỗi theo từng trường (camelCase), chỉ có khi code = "validation_failed". */
  fieldErrors: Record<string, string>;
  /** Lỗi trong file nhập (sheet/dòng/cột), chỉ có khi code = "invalid_file". */
  fileErrors: FileError[];
};

export type FileError = { location: string; row: number | null; column: string | null; message: string };

const messages: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  unauthenticated: "Phiên đăng nhập đã hết, vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  no_active_tenant: "Tài khoản chưa thuộc doanh nghiệp nào đang hoạt động.",
  not_found: "Không tìm thấy dữ liệu.",
  validation_failed: "Dữ liệu chưa hợp lệ, vui lòng kiểm tra các ô được đánh dấu.",
  rate_limited: "Bạn thử quá nhiều lần, vui lòng đợi một phút rồi thử lại.",
  network_error: "Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.",
  internal_error: "Có lỗi xảy ra, vui lòng thử lại.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toProblem(error: unknown, status: number): ApiProblem {
  const body = isRecord(error) ? error : {};
  const fieldErrors: Record<string, string> = {};

  if (isRecord(body.errors)) {
    for (const [field, value] of Object.entries(body.errors)) {
      if (Array.isArray(value) && typeof value[0] === "string") {
        fieldErrors[field] = value[0];
      }
    }
  }

  const fileErrors: FileError[] = Array.isArray(body.fileErrors)
    ? body.fileErrors.filter(isRecord).map((e) => ({
        location: typeof e.location === "string" ? e.location : "",
        row: typeof e.row === "number" ? e.row : null,
        column: typeof e.column === "string" ? e.column : null,
        message: typeof e.message === "string" ? e.message : "",
      }))
    : [];

  const code = typeof body.code === "string" ? body.code : status >= 500 ? "internal_error" : `http_${status}`;
  return {
    status,
    code,
    title: typeof body.title === "string" ? body.title : undefined,
    fieldErrors,
    fileErrors,
  };
}

export function networkProblem(): ApiProblem {
  return { status: 0, code: "network_error", fieldErrors: {}, fileErrors: [] };
}

/**
 * Câu thông báo cho người dùng: ưu tiên câu dịch sẵn theo code, sau đó tới title của BE.
 * Các code nghiệp vụ (conflict, invalid_input, document_exists, invalid_file, ai_unavailable) dùng title của BE vì cụ thể hơn.
 */
export function problemMessage(problem: ApiProblem): string {
  return messages[problem.code] ?? problem.title ?? messages.internal_error;
}
