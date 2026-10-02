/**
 * Chỉ cho chuyển hướng sau đăng nhập tới đường dẫn nội bộ ("/settings"), chặn "https://trang-la.com"
 * hoặc "//trang-la.com" (open redirect: kẻ xấu gửi link đăng nhập thật nhưng dẫn nạn nhân sang trang giả).
 */
export function safeRedirectPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
