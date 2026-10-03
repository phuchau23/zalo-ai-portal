"use client";

import { Badge } from "@/components/ui/badge";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { usePolling, useApiData } from "@/lib/use-api-data";

/** Tổng quan kho + tiến độ đánh chỉ mục; tự cập nhật trong lúc còn việc đang chạy. */
export function StatusBar() {
  const { data, reload } = useApiData(() => call(() => api.GET("/knowledge/status")));
  const busy = Boolean(data && (data.chunksPendingIndex > 0 || data.documentsProcessing > 0));
  usePolling(busy, reload);

  if (!data) return null;

  const indexed = data.chunks - data.chunksPendingIndex;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="secondary">{data.items} mục dữ liệu</Badge>
      <Badge variant="secondary">{data.documents} tài liệu tham khảo</Badge>
      {busy ? (
        <Badge variant="outline" aria-live="polite">
          Đang chuẩn bị cho bot tìm kiếm: {indexed}/{data.chunks} đoạn
          {data.documentsProcessing > 0 && `, ${data.documentsProcessing} tài liệu đang đọc`}
        </Badge>
      ) : (
        data.chunks > 0 && <Badge variant="outline">Sẵn sàng cho bot tìm kiếm</Badge>
      )}
    </div>
  );
}
