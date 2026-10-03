---
name: api-client-sync
description: Đồng bộ type API giữa BE và FE sau khi BE thêm/sửa endpoint hoặc dữ liệu trả về. Dùng mỗi khi BE đổi API, khi FE báo lỗi type ở chỗ gọi api, hoặc khi cần gọi endpoint mới.
---

# Đồng bộ type API với BE

Type dữ liệu API **không viết tay** — sinh từ OpenAPI của BE (CLAUDE.md của BE, mục 4, 8).

1. Chạy API của BE (`dev` hoặc `dotnet run --project src/ZaloAi.Api` trong repo `zalo-ai-assistant`), kiểm tra `http://localhost:4000/openapi/v1.json` mở được.
2. Ở repo FE: `pnpm gen:api` → cập nhật `src/lib/api/schema.d.ts`. Không sửa tay file này.
3. `pnpm typecheck` → sửa mọi chỗ gọi API bị lệch type. Thêm alias type hay dùng vào `src/lib/api/client.ts` (ví dụ `export type Me = Schemas["MeResponse"]`).
4. Mã lỗi (`code`) mới từ BE → thêm câu tiếng Việt vào `src/lib/api/problem.ts` + test trong `problem.test.ts`.
5. Endpoint mới phải đi qua `/api/*` (rewrite trong `next.config.ts`). Đường dẫn BE ngoài `/api` (như `/hangfire`) phải thêm rewrite riêng và thêm vào danh sách bỏ qua trong `src/proxy.ts`.
6. Kiểm tra: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
7. Commit ở **cả hai repo**: BE (thay đổi API) và FE (`schema.d.ts` + code dùng nó), message tiếng Anh, ví dụ `feat(m2): ...`. Claude không tự commit — chỉ đề xuất lệnh.
