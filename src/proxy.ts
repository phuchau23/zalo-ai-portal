import { NextResponse, type NextRequest } from "next/server";

/** Tên cookie phiên do BE đặt (ApiSetup.SessionCookieName). FE không đọc được nội dung (httpOnly). */
const SESSION_COOKIE = "zaloai.session";

/**
 * Kiểm tra sơ bộ: chưa có cookie phiên → về /login. Đây KHÔNG phải kiểm quyền thật:
 * cookie có thể đã hết hạn hoặc bị thu hồi, BE mới là nơi quyết định (trả 401/403).
 * Không chuyển hướng ngược từ /login khi có cookie, để cookie cũ không gây vòng lặp chuyển hướng.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE) || request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Bỏ qua API (BE tự kiểm), dashboard Hangfire (BE tự kiểm), file tĩnh của Next.js và favicon.
  matcher: ["/((?!api|hangfire|_next/static|_next/image|favicon.ico).*)"],
};
