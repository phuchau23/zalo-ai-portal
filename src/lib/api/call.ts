import { networkProblem, toProblem, type ApiProblem } from "./problem";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; problem: ApiProblem };

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/**
 * Gói kết quả openapi-fetch thành ok/problem, và đổi lỗi mạng (BE tắt, mất mạng) thành problem
 * thay vì exception, để màn hình luôn hiện được câu báo lỗi.
 */
export async function call<T>(request: () => Promise<FetchResult<T>>): Promise<ApiResult<T>> {
  try {
    const { data, error, response } = await request();
    if (response.ok) {
      return { ok: true, data: data as T };
    }
    return { ok: false, problem: toProblem(error, response.status) };
  } catch {
    return { ok: false, problem: networkProblem() };
  }
}
