import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

// Thân chữ: Be Vietnam Pro — thiết kế cho tiếng Việt (dấu đặt đúng, không chồng lên nhau ở chữ hoa). Cần subset "vietnamese".
const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Tiêu đề, số lớn, logo: Bricolage Grotesque (biến thiên, có tiếng Việt) — xem design.md § Chữ.
// `axes`: nạp thêm trục độ rộng (wdth) + cỡ quang học (opsz) — `num-display` dùng wdth 80 cho số lớn chữ hẹp.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Remi",
  description: "Sổ khách, lịch hẹn, thu ngân và trợ lý trả lời Zalo cho tiệm dịch vụ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">{children}</body>
    </html>
  );
}
