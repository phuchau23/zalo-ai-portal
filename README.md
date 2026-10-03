# zalo-ai-portal

Trang quản trị (Next.js) của **Trợ lý Zalo AI**. Backend và tài liệu dự án ở repo `../zalo-ai-assistant`.

## Chạy local

Cần BE đang chạy ở cổng 4000 (xem README của `zalo-ai-assistant`).

```
cp .env.example .env.local     # Windows cmd: copy .env.example .env.local
pnpm install
pnpm dev                       # http://localhost:3000
```

Tài khoản mẫu (sau khi chạy `dotnet run --project src/ZaloAi.Api -- seed` ở BE), mật khẩu `Dev@123456`:
`owner@khoahochuyetdao.local`, `owner@anphat.local`, `admin@zaloai.local` (super admin).

## Trang

| Trang | Nội dung |
| --- | --- |
| `/login` | Đăng nhập |
| `/` | Tổng quan |
| `/knowledge` | Kho kiến thức: dữ liệu, nhập file, lịch sử nhập, tài liệu tham khảo, thử tìm kiếm |
| `/knowledge/imports/[id]` | Duyệt bản so sánh khi nhập file (chọn từng mục rồi áp dụng) |
| `/settings` | Cài đặt doanh nghiệp |

Bộ dữ liệu mẫu để thử: `C:\Zalo_Tool\sample-docs\khoa-hoc-huyet-dao\` (xem README trong đó).

## Lệnh

```
pnpm gen:api      # sinh type từ OpenAPI của BE (BE phải đang chạy) → src/lib/api/schema.d.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Cách FE nói chuyện với BE

- Trình duyệt chỉ gọi `/api/*` trên domain của FE; `next.config.ts` chuyển tiếp sang `API_INTERNAL_URL`.
  Cookie phiên `zaloai.session` (httpOnly) vì vậy cùng domain, JavaScript không đọc được.
- `src/proxy.ts` chỉ kiểm tra sơ bộ (có cookie chưa). Quyền thật luôn do BE kiểm.
- Gọi API bằng `api` trong `src/lib/api/client.ts` (type sinh tự động, không viết tay), bọc trong `call()` để nhận lỗi dạng `ApiProblem`.
