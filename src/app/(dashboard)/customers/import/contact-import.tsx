"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Download, Upload } from "lucide-react";
import { FileDrop } from "@/components/common/file-drop";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { uploadFile } from "@/lib/api/upload";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Preview = Schemas["ContactImportPreviewResponse"];
type Result = Schemas["ContactImportResultResponse"];

const actionLabel: Record<string, { label: string; variant: "success" | "info" | "destructive" }> = {
  new: { label: "Khách mới", variant: "success" },
  update: { label: "Cập nhật", variant: "info" },
  error: { label: "Lỗi — bỏ qua", variant: "destructive" },
};

/** Tải mẫu → chọn file → xem trước từng dòng → nhập các dòng hợp lệ (gửi lại đúng file đã xem trước). */
export function ContactImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function choose(next: File) {
    setBusy(true);
    setProblem(null);
    setResult(null);
    const response = await uploadFile<Preview>("/contacts/import/preview", next);
    setBusy(false);
    if (!response.ok) {
      setPreview(null);
      return setProblem(response.problem);
    }

    setFile(next);
    setPreview(response.data);
  }

  async function apply() {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    const response = await uploadFile<Result>("/contacts/import", file);
    setBusy(false);
    if (!response.ok) return setProblem(response.problem);
    setResult(response.data);
    setPreview(null);
    setFile(null);
  }

  const importable = preview ? preview.new + preview.update : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-sm font-semibold">1. Tải file mẫu và điền danh sách</h2>
        <p className="text-sm text-muted-foreground">
          Mỗi dòng một khách. Cột SĐT bắt buộc. Giới tính Nam/Nữ để bot gọi anh/chị; Hẹn nhắn lúc là ngày giờ cần chăm sóc lại. Sheet &quot;Hướng
          dẫn&quot; trong file giải thích từng cột.
        </p>
        <a href="/api/contacts/import/template" download className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start sm:h-9")}>
          <Download aria-hidden />
          Tải file mẫu (.xlsx)
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">2. Chọn file đã điền</h2>
        <FileDrop
          accept=".xlsx"
          formats="Excel (.xlsx), tối đa 5MB, 5.000 khách"
          hint="Hệ thống chỉ đọc và hiện bản xem trước, chưa ghi gì cho tới khi bạn bấm Nhập."
          busy={busy}
          busyLabel="Đang đọc file..."
          onFile={(f) => void choose(f)}
        />
        {problem && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {problemMessage(problem)}
          </p>
        )}
      </section>

      {result && (
        <section role="status" className="flex flex-col gap-3 rounded-md border border-success/30 bg-success/5 p-4">
          <p className="flex items-center gap-2 font-medium text-success">
            <CircleCheck className="size-5" aria-hidden />
            Đã nhập xong
          </p>
          <p className="text-sm">
            {result.created} khách mới · {result.updated} khách cập nhật · {result.followUps} lịch hẹn chăm sóc
            {result.skipped > 0 && ` · ${result.skipped} dòng lỗi bị bỏ qua`}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/customers" className={cn(buttonVariants(), "h-11 sm:h-9")}>
              Xem danh sách khách
            </Link>
            <Link href="/care" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
              Trang Cần chăm sóc
            </Link>
          </div>
        </section>
      )}

      {preview && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold">3. Kiểm tra rồi nhập</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="success">{preview.new} khách mới</Badge>
              <Badge variant="info">{preview.update} cập nhật</Badge>
              {preview.error > 0 && <Badge variant="destructive">{preview.error} dòng lỗi</Badge>}
            </div>
          </div>
          {preview.error > 0 && (
            <p className="text-sm text-muted-foreground">Dòng lỗi sẽ bị bỏ qua. Muốn nhập cả những dòng đó: sửa trong file rồi chọn lại file.</p>
          )}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Dòng</th>
                  <th className="px-3 py-2 font-medium">Khách</th>
                  <th className="px-3 py-2 font-medium">Đã làm gì</th>
                  <th className="px-3 py-2 font-medium">Hẹn nhắn lúc</th>
                  <th className="px-3 py-2 font-medium">Nhận tin ưu đãi</th>
                  <th className="px-3 py-2 font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const action = actionLabel[r.action] ?? actionLabel.error;
                  return (
                    <tr key={r.row} className="border-t align-top">
                      <td className="tabular px-3 py-2 text-muted-foreground">{r.row}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.name ?? "—"}</div>
                        <div className="tabular text-xs text-muted-foreground">
                          {r.phone ?? "—"}
                          {r.salutation && ` · gọi "${r.salutation}"`}
                        </div>
                        {r.existingName && r.existingName !== r.name && <div className="text-xs text-muted-foreground">Đang có: {r.existingName}</div>}
                      </td>
                      <td className="px-3 py-2">{r.service ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2">{r.followUpAt ? formatDateTime(r.followUpAt) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2">{r.consent === null ? <span className="text-muted-foreground">—</span> : r.consent ? "Có" : "Không"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={action.variant}>{action.label}</Badge>
                        {r.errors.map((e) => (
                          <p key={e} className="mt-1 text-xs text-destructive">
                            {e}
                          </p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            &quot;Có&quot; ở cột nhận tin ưu đãi nghĩa là doanh nghiệp xác nhận khách đã đồng ý nhận tin khuyến mãi; hệ thống ghi lại nguồn và thời
            điểm.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void apply()} disabled={busy || importable === 0} className="h-11 sm:h-9">
              <Upload aria-hidden />
              {busy ? "Đang nhập..." : `Nhập ${importable} khách`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              disabled={busy}
              className="h-11 sm:h-9"
            >
              Hủy
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
