"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "@/lib/api/call";
import type { ApiProblem } from "@/lib/api/problem";

type State<T> = { data?: T; problem?: ApiProblem; loading: boolean };

/**
 * Tải dữ liệu từ BE khi component hiện lên; `reload()` để tải lại (sau khi sửa, hoặc định kỳ).
 * Giữ dữ liệu cũ trong lúc tải lại để màn hình không nhấp nháy.
 */
export function useApiData<T>(fetcher: () => Promise<ApiResult<T>>) {
  const [state, setState] = useState<State<T>>({ loading: true });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetcherRef.current();
      if (cancelled) return;
      setState((previous) =>
        result.ok ? { data: result.data, loading: false } : { data: previous.data, problem: result.problem, loading: false },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

/** Gọi `reload` mỗi `ms` khi `active` = true (ví dụ còn tài liệu đang xử lý). */
export function usePolling(active: boolean, reload: () => void, ms = 3000) {
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(reload, ms);
    return () => clearInterval(timer);
  }, [active, reload, ms]);
}
