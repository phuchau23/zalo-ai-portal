"use client";

import { useState } from "react";
import { BookOpenCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

/** Nhãn nhỏ cạnh tên mục/tài liệu đã được người có chuyên môn duyệt. */
export function MedicalReviewBadge() {
  return (
    <Badge variant="success">
      <BookOpenCheck aria-hidden />
      Đã duyệt chuyên môn
    </Badge>
  );
}

/**
 * Đánh dấu nội dung đã được người có chuyên môn (bác sĩ, kỹ thuật viên trưởng) duyệt.
 * Ngành sức khỏe: bot chỉ giải thích bệnh/tình trạng cơ thể từ nội dung đã duyệt. Sửa nội dung → tự bỏ đánh dấu.
 */
export function MedicalReviewToggle({
  target,
  id,
  reviewed,
  canEdit,
  onChanged,
  compact = false,
}: {
  target: "items" | "documents";
  id: string;
  reviewed: boolean;
  canEdit: boolean;
  onChanged: () => void;
  /** Bỏ câu giải thích (dùng trong bảng). */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function toggle() {
    setBusy(true);
    setProblem(null);
    const body = { reviewed: !reviewed };
    const result =
      target === "items"
        ? await call(() => api.PUT("/knowledge/items/{itemId}/medically-reviewed", { params: { path: { itemId: id } }, body }))
        : await call(() => api.PUT("/knowledge/documents/{documentId}/medically-reviewed", { params: { path: { documentId: id } }, body }));
    setBusy(false);
    if (result.ok) onChanged();
    else setProblem(result.problem);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {reviewed ? <MedicalReviewBadge /> : <Badge variant="secondary">Chưa duyệt chuyên môn</Badge>}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void toggle();
            }}
            disabled={busy}
          >
            {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {reviewed ? "Bỏ đánh dấu" : "Đánh dấu đã duyệt"}
          </Button>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Chỉ đánh dấu khi người có chuyên môn đã đọc và xác nhận nội dung. Bot chỉ dùng nội dung đã duyệt để giải thích về bệnh hoặc tình trạng cơ thể.
        </p>
      )}
      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
    </div>
  );
}
