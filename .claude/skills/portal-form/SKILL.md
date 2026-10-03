---
name: portal-form
description: Cách làm form nhập liệu trong trang quản trị zalo-ai-portal (tạo/sửa dữ liệu, gửi lên BE, hiện lỗi từng ô). Dùng mỗi khi thêm form, ô nhập, nút lưu, hoặc xử lý lỗi validate từ BE.
---

# Form nhập liệu

Mẫu chuẩn: `src/app/(dashboard)/settings/settings-form.tsx` và `src/app/login/login-form.tsx`.

1. **State:** một object `values` có type lấy từ OpenAPI (`Schemas["<TenRequest>"]`), cập nhật bằng hàm `update(patch)`. Không thêm thư viện form (react-hook-form, zod...) khi chưa hỏi chủ dự án.
2. **Validate:** BE là nơi validate chính (FluentValidation, câu lỗi tiếng Việt). FE chỉ chặn những gì hiển nhiên (`required`, `maxLength`, `type="email"/"url"`) để đỡ một lượt gọi API, và luôn đặt `noValidate` trên `<form>` để lỗi hiện thống nhất theo kiểu của BE.
3. **Gửi:** `call(() => api.POST|PUT(...))`, khóa nút trong lúc gửi (`disabled` + chữ "Đang lưu..."). Chuẩn hóa trước khi gửi (trim, chuỗi rỗng → `null` cho trường tùy chọn).
4. **Lỗi:**
   - `problem.fieldErrors[<tenTruongCamelCase>]` → hiện dưới ô đó (`text-sm text-destructive`) và đặt `aria-invalid` cho ô.
   - Lỗi chung → `Alert variant="destructive"` với `problemMessage(problem)`.
   - Mã lỗi mới từ BE → thêm câu tiếng Việt vào `messages` trong `src/lib/api/problem.ts` (+ test).
5. **Thành công:** thông báo ngắn ("Đã lưu …"), ẩn khi người dùng sửa tiếp; dữ liệu ảnh hưởng thanh trên (tên doanh nghiệp...) → gọi `useSession().reload()`.
6. **Quyền:** người không có quyền sửa (staff) thấy form ở trạng thái `disabled` + một dòng giải thích, không thấy nút Lưu.
7. **Ô nhập:** mỗi ô có `Label htmlFor` khớp `id`, gợi ý ngắn (`hint`) dưới ô, `autoComplete` đúng cho email/mật khẩu. Dùng component `Field` dạng như trong `settings-form.tsx`.
8. **Dữ liệu nhạy cảm:** không lưu giá trị form vào `localStorage`/`sessionStorage`; không đưa vào URL.
