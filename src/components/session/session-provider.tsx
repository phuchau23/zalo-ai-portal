"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type Me } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

type SessionValue = {
  me: Me;
  /** Gọi lại /auth/me, ví dụ sau khi đổi tenant hoặc sửa tên doanh nghiệp. */
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

const fetchMe = () => call(() => api.GET("/auth/me"));

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession phải dùng bên trong <SessionProvider>.");
  }
  return value;
}

/**
 * Lấy thông tin đăng nhập từ BE (/auth/me). BE trả 401 (cookie hết hạn/bị thu hồi) → về trang đăng nhập.
 * Quyền thật luôn do BE kiểm ở từng API; phần này chỉ để hiển thị.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  const apply = useCallback(
    (result: ApiResult<Me>) => {
      if (result.ok) {
        setMe(result.data);
        setProblem(null);
      } else if (result.problem.status === 401) {
        router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
      } else {
        setProblem(result.problem);
      }
    },
    [router, pathname],
  );

  const load = useCallback(async () => apply(await fetchMe()), [apply]);

  useEffect(() => {
    // Dữ liệu ngoài (BE) chỉ lấy được sau khi trang chạy trên trình duyệt (cookie httpOnly đi kèm request).
    let cancelled = false;
    void (async () => {
      const result = await fetchMe();
      if (!cancelled) apply(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  if (problem) {
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <CircleAlert className="size-6 text-destructive" aria-hidden />
        <p className="text-sm text-destructive">{problemMessage(problem)}</p>
        <Button variant="outline" onClick={() => void load()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!me) {
    return (
      <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Đang tải...
      </div>
    );
  }

  return <SessionContext value={{ me, reload: load }}>{children}</SessionContext>;
}
