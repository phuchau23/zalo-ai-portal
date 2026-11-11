import type { ApiResult } from "./call";
import { networkProblem, toProblem } from "./problem";

/**
 * Upload file (multipart/form-data, trường "file") lên BE qua /api. Dùng fetch trực tiếp vì openapi-fetch
 * không tiện với FormData; kiểu dữ liệu trả về vẫn lấy từ schema sinh tự động (tham số T).
 */
export async function uploadFile<T>(path: string, file: File, query?: Record<string, string>): Promise<ApiResult<T>> {
  const form = new FormData();
  form.append("file", file);
  const search = query ? `?${new URLSearchParams(query).toString()}` : "";

  try {
    const response = await fetch(`/api${path}${search}`, { method: "POST", body: form });
    const body: unknown = response.headers.get("content-type")?.includes("json") ? await response.json() : undefined;
    return response.ok ? { ok: true, data: body as T } : { ok: false, problem: toProblem(body, response.status) };
  } catch {
    return { ok: false, problem: networkProblem() };
  }
}
