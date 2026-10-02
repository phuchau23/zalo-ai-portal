import type { NextConfig } from "next";

// BE (ASP.NET Core). Trình duyệt chỉ gọi /api/* trên cùng domain với FE, Next.js chuyển tiếp sang BE,
// nhờ vậy cookie phiên đăng nhập (httpOnly) nằm cùng domain và FE không bao giờ đọc được nó.
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
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
