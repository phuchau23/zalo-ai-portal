"use client";

import { useState } from "react";
import { CircleAlert, FileSpreadsheet, FileStack, FileText, FileType2, LoaderCircle, Trash2 } from "lucide-react";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api, type KnowledgeDocument } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { uploadFile } from "@/lib/api/upload";
import { formatBytes, formatDateTime } from "@/lib/format";
import { useApiData, usePolling } from "@/lib/use-api-data";
import { DropZone } from "./drop-zone";
import { MedicalReviewToggle } from "./medical-review";

const statusLabels: Record<string, { label: string; variant: "info" | "success" | "secondary" | "destructive" }> = {
  pending: { label: "Đang chờ", variant: "secondary" },
  processing: { label: "Đang đọc", variant: "info" },
  ready: { label: "Sẵn sàng", variant: "success" },
  failed: { label: "Lỗi", variant: "destructive" },
};

/** Ô biểu tượng theo loại file: PDF đỏ, Word xanh, Excel xanh lá, văn bản xám — kèm đuôi file chữ in hoa. */
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const style: { icon: typeof FileText; tone: Tone } =
    ext === "xlsx"
      ? { icon: FileSpreadsheet, tone: "success" }
      : ext === "pdf"
        ? { icon: FileType2, tone: "destructive" }
        : ext === "docx"
          ? { icon: FileText, tone: "primary" }
          : { icon: FileText, tone: "muted" };
  return (
    <span className="relative shrink-0">
      <IconTile icon={style.icon} tone={style.tone} size="md" />
      {ext && (
        <span className="absolute -right-1.5 -bottom-1 rounded-md border bg-card px-1 text-[9px] leading-4 font-bold text-muted-foreground uppercase shadow-sm" aria-hidden>
          {ext}
        </span>
      )}
    </span>
  );
}

export function DocumentsTab({ canEdit }: { canEdit: boolean }) {
  const { data, problem: loadProblem, loading, reload } = useApiData(() => call(() => api.GET("/knowledge/documents")));
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDocument | null>(null);

  usePolling(Boolean(data?.some((d) => d.status === "pending" || d.status === "processing")), reload);

  async function upload(file: File, replace: boolean) {
    setUploading(true);
    setProblem(null);
    const result = await uploadFile<KnowledgeDocument>("/knowledge/documents", file, { replace: String(replace) });
    setUploading(false);

    if (result.ok) {
      reload();
    } else if (result.problem.code === "document_exists") {
      setConfirmReplace(file);
    } else {
      setProblem(result.problem);
    }
  }

  async function remove(document: KnowledgeDocument) {
    const result = await call(() => api.DELETE("/knowledge/documents/{documentId}", { params: { path: { documentId: document.id } } }));
    if (!result.ok) setProblem(result.problem);
    reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Tài liệu tự do để bot tham khảo thêm: quy trình, giới thiệu, bài viết. Bảng giá và dịch vụ nên nhập bằng file mẫu (tab Nhập file) để so sánh
        được khi cập nhật.
      </p>

      {canEdit && (
        <DropZone
          accept=".pdf,.docx,.xlsx,.txt,.md"
          formats="PDF, Word, Excel, TXT, MD"
          hint="tối đa 20 MB"
          busy={uploading}
          onFile={(file) => void upload(file, false)}
        />
      )}

      {problem && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}

      {loadProblem && !data && <ErrorState problem={loadProblem} onRetry={reload} />}
      {loading && !data && !loadProblem && <LoadingRows columns={4} rows={3} />}

      {data && data.length === 0 && (
        <EmptyState
          icon={FileStack}
          title="Chưa có tài liệu tham khảo"
          description={canEdit ? "Kéo thả file vào ô phía trên để thêm." : "Chủ doanh nghiệp có thể thêm tài liệu ở đây."}
        />
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài liệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="hidden text-right md:table-cell">Kích thước</TableHead>
                <TableHead className="hidden md:table-cell">Cập nhật</TableHead>
                {canEdit && (
                  <TableHead className="w-12">
                    <span className="sr-only">Thao tác</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => {
                const status = statusLabels[d.status] ?? { label: d.status, variant: "secondary" as const };
                const working = d.status === "pending" || d.status === "processing";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <FileIcon name={d.fileName} />
                        <div className="min-w-0">
                          <div className="font-medium break-all">{d.fileName}</div>
                          {d.error && <div className="text-sm text-destructive">{d.error}</div>}
                          {d.status === "ready" && (canEdit || d.medicallyReviewed) && (
                            <div className="mt-1.5">
                              <MedicalReviewToggle target="documents" id={d.id} reviewed={d.medicallyReviewed} canEdit={canEdit} onChanged={reload} compact />
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground md:hidden">
                            {formatBytes(d.sizeBytes)} · {formatDateTime(d.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={status.variant}>
                          {working && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                          {status.label}
                        </Badge>
                        {d.status === "ready" && <span className="tabular text-xs text-muted-foreground">{d.chunkCount.toLocaleString("vi-VN")} đoạn</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">{formatBytes(d.sizeBytes)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(d.updatedAt)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmDelete(d)}
                          aria-label={`Xóa ${d.fileName}`}
                          title="Xóa"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={confirmReplace !== null} onOpenChange={(open) => !open && setConfirmReplace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thay thế tài liệu cũ?</AlertDialogTitle>
            <AlertDialogDescription>
              Đã có tài liệu tên &quot;{confirmReplace?.name}&quot;. Thay thế sẽ xóa nội dung cũ và đọc lại bản mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReplace) void upload(confirmReplace, true);
                setConfirmReplace(null);
              }}
            >
              Thay thế
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài liệu?</AlertDialogTitle>
            <AlertDialogDescription>
              Bot sẽ không dùng &quot;{confirmDelete?.fileName}&quot; để trả lời nữa. Không hoàn tác được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDelete) void remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
