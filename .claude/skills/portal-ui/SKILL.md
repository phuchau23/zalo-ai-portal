---
name: portal-ui
description: Thiết kế hoặc chỉnh giao diện trang quản trị zalo-ai-portal (bố cục, màu, chữ, component, trạng thái trống/đang tải, giao diện điện thoại). Dùng khi làm màn hình mới cần thiết kế, khi chủ dự án nói giao diện xấu hoặc khó dùng, hoặc khi cần rà soát UI.
---

# Giao diện trang quản trị

Dùng skill **`ui-ux-pro-max`** (bản đã rà soát, nằm trong repo: `.claude/skills/ui-ux-pro-max/`, nguồn ghi ở `SOURCE.md`) làm bộ quy tắc thiết kế, **trong ranh giới của dự án** ở bước 3. Khi skill đó và ranh giới này mâu thuẫn, ranh giới thắng. Không sửa file trong thư mục `ui-ux-pro-max/`.

1. **Chế độ dùng:** máy chủ dự án **không cài Python** (chủ dự án chốt 2026-10-03) → không chạy `scripts/search.py`, không dùng `--design-system`/`--persist`. Thay vào đó đọc trực tiếp:
   - `references/quick-reference.md` — 119 quy tắc UX theo 10 nhóm ưu tiên (đọc nhóm liên quan, không đọc hết mỗi lần).
   - `references/pro-rules.md` — quy tắc hoàn thiện + **checklist trước khi giao** (bắt buộc chạy qua ở bước 4).
   - `data/stacks/shadcn.csv`, `data/stacks/nextjs.csv` — lưu ý riêng cho stack của repo.
   - Khi cần chọn hướng hình ảnh: tìm dòng phù hợp trong `data/products.csv` (cột "Dashboard Style"), `data/ux-guidelines.csv`, `data/charts.csv` (biểu đồ báo cáo M6) bằng Grep theo từ khóa (ví dụ `dashboard`, `form`, `table`, `empty state`).
   Nếu sau này cài Python: chạy `python .claude/skills/ui-ux-pro-max/scripts/search.py "<truy vấn>" --stack shadcn` từ thư mục gốc repo FE (biến `${CLAUDE_PLUGIN_ROOT}` trong SKILL.md của skill chỉ dùng khi cài dạng plugin), và cập nhật bước này.
2. **Thứ tự ưu tiên** theo bảng của `ui-ux-pro-max`: Accessibility → Touch & Interaction → Performance → Style → Layout & Responsive → Typography & Color → Animation → Forms & Feedback → Navigation → Charts.
3. **Ranh giới dự án:**
   - Đây là **trang quản trị dùng hằng ngày** (SaaS B2B), không phải landing page: ưu tiên dễ quét, mật độ thông tin vừa phải, thao tác lặp lại nhanh. Bỏ qua phần gợi ý landing page/hero/glassmorphism trang trí.
   - **Dùng shadcn/ui có sẵn** (`src/components/ui`, style `radix-nova`) và token màu CSS variables trong `src/app/globals.css`; không viết mã màu hex trực tiếp trong component. Thêm component: `pnpm dlx shadcn@latest add <ten>`. Đổi theme, màu chủ đạo, font → hỏi chủ dự án trước; giữ một bộ token chung cho mọi trang.
   - Font phải có subset `vietnamese` (hiện dùng Geist qua `next/font`).
   - Không thêm thư viện UI, icon, animation mới khi chưa hỏi (đã có `lucide-react`; không dùng emoji làm icon).
   - Chữ trên giao diện bằng tiếng Việt, câu ngắn, rõ việc cần làm; không dùng thuật ngữ kỹ thuật với chủ doanh nghiệp (ví dụ "tenant" → "doanh nghiệp").
   - Mỗi màn hình đủ trạng thái: đang tải, trống (kèm hướng dẫn bước tiếp theo), lỗi, không có quyền (staff), chưa có doanh nghiệp.
   - **Điện thoại:** chủ doanh nghiệp hay xem trên điện thoại → kiểm tra ở bề ngang 375px, không cuộn ngang, vùng bấm tối thiểu 44×44px.
   - Truy cập được: mọi ô nhập có `Label`, lỗi hiện ngay dưới ô + `aria-invalid`, focus nhìn thấy được, tương phản chữ ≥ 4.5:1.
4. **Kiểm tra:** đi qua checklist trong `references/pro-rules.md`; `pnpm lint && pnpm typecheck && pnpm build`; chạy `pnpm dev` và nhờ chủ dự án chụp màn hình desktop + điện thoại để duyệt.
