---
name: portal-page
description: Quy trình thêm hoặc sửa một trang/màn hình trong trang quản trị zalo-ai-portal (route mới, mục menu, trang lấy dữ liệu từ BE). Dùng mỗi khi tạo trang mới, thêm mục vào menu, hoặc màn hình cần gọi API của BE.
---

# Thêm trang quản trị

Next.js trong repo là bản 16: đọc hướng dẫn liên quan trong `node_modules/next/dist/docs/` trước khi dùng API của Next (AGENTS.md). Ví dụ: `middleware` đã đổi tên thành `proxy`, `cookies()`/`searchParams`/`params` là async.

1. **API trước:** nếu BE chưa có endpoint, làm ở repo BE trước (skill `tenant-safe-feature` của BE), rồi đồng bộ type bằng skill `api-client-sync`.
2. **Route:** trang cần đăng nhập đặt trong `src/app/(dashboard)/<ten>/page.tsx` — layout nhóm này đã bọc `SessionProvider` + `AppShell` (lấy `/auth/me`, 401 → về `/login`). Trang công khai (hiếm) đặt ngoài nhóm và thêm vào điều kiện bỏ qua trong `src/proxy.ts`.
   - `page.tsx` là server component mỏng: `metadata` (title "… — Trợ lý Zalo AI") + tiêu đề + render component client.
   - Phần lấy dữ liệu/tương tác là client component (`"use client"`) cùng thư mục, ví dụ `settings-form.tsx`.
3. **Gọi API:** chỉ qua `api` (`src/lib/api/client.ts`) bọc trong `call()` (`src/lib/api/call.ts`) → nhận `{ ok, data }` hoặc `{ ok: false, problem }`. Không dùng `fetch` thô, không viết tay type dữ liệu API.
   - Lấy dữ liệu trong `useEffect` theo mẫu có cờ `cancelled` (xem `settings-form.tsx`), phụ thuộc `me.currentTenant?.id` để tải lại khi đổi tenant.
   - **Không gửi `tenantId`** lên BE; BE lấy tenant từ cookie.
4. **Trạng thái bắt buộc:** đang tải, lỗi (`problemMessage(problem)` trong `Alert variant="destructive"`), trống, và không có quyền.
5. **Quyền:** đọc vai trò từ `useSession().me.currentTenant.role` (`owner` | `staff`) chỉ để **ẩn/khóa nút** cho dễ dùng; quyền thật do BE kiểm (403 vẫn phải hiện thông báo tử tế).
6. **Menu:** thêm vào `navItems` trong `src/components/shell/app-shell.tsx`. Mục chỉ dành cho super admin đặt trong nhánh `me.isSuperAdmin`.
7. **Bảo mật hiển thị:** không hiển thị/log token; dữ liệu khách cuối (SĐT, nội dung tin) chỉ hiện ở màn hình thật sự cần; không dùng `dangerouslySetInnerHTML`; link chuyển hướng sau thao tác dùng `safeRedirectPath`.
8. **Giao diện:** theo skill `portal-ui`.
9. **Kiểm tra:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`; hàm thuần (map dữ liệu, kiểm điều kiện) viết test vitest cạnh file (`*.test.ts`). Chạy `dev` ở repo BE và thử bằng tay với cả tài khoản owner, staff, super admin.
