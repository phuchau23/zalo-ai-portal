# Design — Remi

Hệ thống thiết kế khóa cho trang quản trị. Mọi trang đọc file này trước khi sửa giao diện; cần thứ hệ thống chưa cho phép
thì **sửa file này trước**, không tự chế ở từng trang. Chủ dự án giao toàn quyền thương hiệu + thiết kế (2026-11-06).

## Thương hiệu

- **Tên:** **Remi** — tên công ty và sản phẩm (chủ dự án chốt 2026-11-06). Viết thường trong logo: `remi`. Đọc "rê-mi".
  Gốc từ *remember* (nhớ khách) + *reminder* (nhắc lịch, nhắc chăm sóc) — đúng hai việc sản phẩm làm.
  Thay "Trợ lý Zalo AI" — tên cũ chứa thương hiệu Zalo (rủi ro pháp lý khi bán) và đọc như mọi công cụ AI khác.
  Tên trợ lý trả lời khách vẫn do từng doanh nghiệp đặt (ví dụ "Huyệt Đạo") — khách cuối không thấy chữ Remi.
- **Câu định vị:** *Giữ khách như người quen.*
- **Mô tả một dòng:** Sổ khách, lịch hẹn, thu ngân và trợ lý trả lời Zalo cho tiệm dịch vụ.
- **Logo:** ô vuông xanh chanh bo góc 22%, chữ `r` màu mực (Bricolage Grotesque 800) + chữ `remi` màu mực. Không dải màu, không bóng.
  Code: `LogoMark`, `Wordmark` trong `src/components/brand/logo.tsx`.
- **Giọng:** như chủ tiệm nói với nhân viên — ngắn, cụ thể, động từ trước. Không "AI-powered", không "thông minh vượt trội",
  không dấu chấm than. Trợ lý được gọi là **"trợ lý"** hoặc **"bot"** (người dùng quen chữ này), không gọi "AI" ở tiêu đề lớn.

## Thể loại

modern-minimal có phá cách — **Remi Bento** (đợt 2, 2026-11-06, chủ dự án muốn "đẹp, phá cách, theo xu hướng"):
bố cục bento (ô to nhỏ khác nhau, mỗi ô một nội dung), tô khối màu pastel, số thật to chữ hẹp, một màu chữ ký xanh chanh.
Khung app: thanh bên trắng cố định + vùng làm việc phẳng; tiêu đề trang chữ lớn bên trái, thao tác bên phải.

## Màu (OKLCH — token trong `src/app/globals.css`)

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--canvas` | `oklch(97% 0.004 250)` xám sương mát | nền vùng làm việc |
| `--card` / `--background` | `oklch(99.8% 0.0015 250)` | thẻ, ô nhập, nút viền |
| `--foreground` = `--primary` (mực than) | `oklch(20% 0.016 262)` | chữ chính, **nút chính**, tab/viên/mục menu đang chọn |
| `--lime` (xanh chanh — chữ ký) | `oklch(91.5% 0.195 122)` + chữ `--lime-foreground` | logo, ô số liệu chính, vùng biểu đồ doanh thu, biểu tượng mục menu đang mở, số đếm trên menu |
| `--tint-sky/peach/sage/butter` | pastel L≈93% | tô khối các ô số liệu theo nhóm (chữ vẫn màu mực) |
| `--zalo` (xanh Zalo #0068FF) | `oklch(56.7% 0.239 260.5)` + chữ trắng; nhạt `--zalo-soft` | **chỉ** thứ liên quan Zalo: nút "Kết nối Zalo OA" (`<Button variant="zalo">`), ô biểu tượng OA, nhãn kênh Zalo |
| `--ai` (chàm) | `oklch(47% 0.14 265)` | việc trợ lý làm (nhãn "Bot chốt"...) |
| `--ring` | `oklch(47% 0.14 262)` | vòng focus (luôn thấy rõ trên nền sáng/chanh) |
| `--success` · `--warning` · `--destructive` | xanh lá · cam · đỏ | trạng thái, luôn kèm biểu tượng/chữ |

**Quy tắc chanh:** chanh luôn là **nền** đi với chữ mực — không dùng chanh làm màu chữ trên nền sáng (thiếu tương phản).
Mỗi màn chỉ **một** khối chanh lớn (ô số liệu chính hoặc khối thương hiệu); còn lại là điểm nhỏ.
Pastel: tối đa 3–4 ô một hàng, mỗi ô một màu; không đặt pastel lên pastel.

## Chữ

- **Tiêu đề / số lớn / logo:** Bricolage Grotesque (biến thiên), 600–700, `letter-spacing: -0.02em`. Chỉ dùng cho `h1`, `h2`,
  số thống kê, logo. Không nghiêng.
- **Thân:** Be Vietnam Pro 400/500/600 — dựng cho tiếng Việt (dấu không chồng ở chữ hoa).
- Số trong bảng/thống kê: `tabular-nums`.
- Thang: tiêu đề trang 26–30px · tiêu đề khối 15–16px · thân 14–15px · chú thích 12–13px (không dưới 12px).

## Hình khối

- Bo góc: thẻ/ô bento 18px (`surface`, `rounded-2xl`), ô nhập 12px, **nút và tab bo tròn hẳn (viên)**.
- Viền mảnh `--border` tách lớp; ô màu (chanh, pastel) không viền, không bóng. Bóng rõ chỉ cho lớp nổi (menu, hộp thoại).
- **Không thẻ lồng thẻ**: ô màu đặt thẳng trên nền xám sương, không bọc trong thẻ trắng.
- Số lớn: tiện ích `num-display` (Bricolage hẹp trục wdth 80, đậm 700, `whitespace-nowrap`).

## Chuyển động

- Thư viện `motion` (có sẵn). Chỉ `transform`/`opacity`. Nhịp ở `src/lib/motion.ts`.
- Giữ: viên "đang chọn" trượt giữa tab, số chạy khi đổi dữ liệu, biểu đồ vẽ vào. Bỏ: nhấp nhô (float), quầng sáng, chấm nhấp nháy trang trí.
- `prefers-reduced-motion` → chỉ mờ dần.

## Thành phần — cách dùng

- **Nút chính:** nền mực, chữ trắng, dạng viên. **Nút phụ:** viền, nền thẻ. **Nguy hiểm:** chữ đỏ, chỉ nền đỏ trong hộp xác nhận.
- **Tab đầu trang / viên lọc đang chọn:** viên mực (trượt). Tab phụ: gạch chân.
- **Mục thanh bên đang mở:** viên mực, chữ trắng, **biểu tượng xanh chanh**.
- **Ô số:** `StatCard` — `emphasis` = khối chanh (ô quan trọng nhất), `tint="sky|peach|sage|butter"` = khối pastel; `MetricTile` cho trang làm việc.
- **Biểu đồ:** `src/components/charts/`; doanh thu dùng `tone="brand"` (đường mực, vùng chanh); thanh xếp hạng nền chanh nhạt.
- **Ô biểu tượng (`IconTile`):** nền xám nhạt, biểu tượng mực/màu trạng thái. Không đặt cạnh tiêu đề trang.
- **Trạng thái trống:** khung viền đứt, căn trái, biểu tượng nhỏ + một câu vì sao trống + nút việc tiếp theo.
- **Điểm nhấn chữ:** cụm từ quan trọng có thể tô nền chanh như bút dạ (`bg-lime px-2 rounded-lg box-decoration-clone`) — tối đa một chỗ mỗi màn.

## Cấm (dấu hiệu "giao diện AI")

Dải màu xanh→tím, chữ dải màu, quầng sáng/blob mờ, lưới chấm trang trí, bóng phát sáng, kính mờ trang trí, ô biểu tượng dải màu
cạnh mọi tiêu đề, biểu tượng lấp lánh cho mọi thứ "AI", nhấp nhô vô cớ, số liệu bịa.

## Cho phép khác nhau giữa các trang

Bố cục bên trong vùng làm việc (lịch, hộp thư, bảng, biểu đồ). **Phải giống nhau:** logo, màu, chữ, nút, thanh bên, tiêu đề trang.
