@AGENTS.md

# CLAUDE.md — Trợ lý Zalo AI (Frontend: zalo-ai-portal)

Repo này là **frontend `zalo-ai-portal`** (Next.js, trang quản trị) của dự án Trợ lý Zalo AI.
Nguồn chính của dự án (nguyên tắc sản phẩm, kiến trúc, quy trình làm việc, kế hoạch module, tiến độ) nằm ở repo backend:

- `../zalo-ai-assistant/CLAUDE.md` — **đọc file này trước mỗi phiên**
- `../zalo-ai-assistant/docs/PROGRESS.md` — tiến độ (cập nhật ở đó, không tạo PROGRESS riêng ở đây)
- `../zalo-ai-assistant/docs/DECISIONS.md` — quyết định kỹ thuật

## Quy tắc riêng cho FE
- Next.js App Router + TypeScript strict + Tailwind + shadcn/ui. Không `any` trừ khi có comment giải thích.
- **Chỉ gọi BE qua HTTP.** Không chứa secret, không kết nối DB, không gọi AI hay Zalo trực tiếp.
- Gọi API qua đường dẫn tương đối `/api/*`; Next.js rewrite tới `API_INTERNAL_URL` (BE) để cookie session httpOnly cùng domain.
- Type API sinh từ OpenAPI của BE (`pnpm gen:api` → `src/lib/api/`). Không viết tay type cho dữ liệu từ API.
- Không tự quyết `tenantId` ở FE; BE lấy tenant từ session.
- Không hiển thị/log token. Dữ liệu khách cuối (SĐT, nội dung tin) chỉ hiện ở màn hình cần thiết.
- Thêm thư viện → hỏi chủ dự án trước.

## Lệnh
```
pnpm dev            # cổng 3000 (BE chạy ở cổng 4000)
pnpm gen:api        # sinh type từ OpenAPI của BE (thêm ở M1)
pnpm lint | pnpm typecheck | pnpm build
```
