import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";

// Be Vietnam Pro: thiết kế cho tiếng Việt (dấu đặt đúng, không chồng lên nhau ở chữ hoa). Cần subset "vietnamese".
const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trợ lý Zalo AI",
  description: "Trang quản trị trợ lý AI chăm sóc khách hàng trên Zalo OA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">{children}</body>
    </html>
  );
}
