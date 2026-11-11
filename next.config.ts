import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// BE (ASP.NET Core). Trình duyệt chỉ gọi /api/* trên cùng domain với FE, Next.js chuyển tiếp sang BE,
// nhờ vậy cookie phiên đăng nhập (httpOnly) nằm cùng domain và FE không bao giờ đọc được nó.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * IP mạng nội bộ (IPv4) của máy dev — để mở FE trên điện thoại cùng Wi-Fi (trang /phone-test) khi chạy `pnpm dev`.
 * Next.js mặc định chặn tài nguyên dev khi mở bằng hostname khác localhost. Không ảnh hưởng bản build production.
 */
function lanHosts(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .flatMap((a) => (a && a.family === "IPv4" && !a.internal ? [a.address] : []));
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts(),
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiInternalUrl}/:path*` },
      // Dashboard Hangfire (chỉ super admin) dùng đường dẫn tuyệt đối /hangfire/... cho trang và file tĩnh.
      { source: "/hangfire", destination: `${apiInternalUrl}/hangfire` },
      { source: "/hangfire/:path*", destination: `${apiInternalUrl}/hangfire/:path*` },
    ];
  },
};

export default nextConfig;
