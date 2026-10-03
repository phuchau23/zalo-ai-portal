"use client";

import { useRef, useState } from "react";
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

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Đang chờ", variant: "outline" },
  processing: { label: "Đang đọc", variant: "outline" },
  ready: { label: "Sẵn sàng", variant: "secondary" },
  failed: { label: "Lỗi", variant: "destructive" },
};

export function DocumentsTab({ canEdit }: { canEdit: boolean }) {
  const { data, problem: loadProblem, reload } = useApiData(() => call(() => api.GET("/knowledge/documents")));
  const input = useRef<HTMLInputElement>(null);
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
    if (input.current) input.current.value = "";

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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Tài liệu tự do (PDF, Word, Excel không theo mẫu, TXT, MD — tối đa 20 MB) để bot tham khảo thêm: quy trình, giới thiệu, bài viết. Bảng
        giá và dịch vụ nên nhập bằng file mẫu để so sánh được khi cập nhật.
      </p>

      {canEdit && (
        <div>
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,.xlsx,.txt,.md"
            className="sr-only"
            id="knowledge-document-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file, false);
            }}
          />
          <Button onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? "Đang tải lên..." : "Thêm tài liệu"}
          </Button>
        </div>
      )}

      {(problem ?? loadProblem) && (
        <Alert variant="destructive">
          <AlertDescription>{problemMessage((problem ?? loadProblem)!)}</AlertDescription>
        </Alert>
      )}

      {data && data.length === 0 && <p className="text-muted-foreground">Chưa có tài liệu tham khảo nào.</p>}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài liệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="hidden md:table-cell">Kích thước</TableHead>
                <TableHead className="hidden md:table-cell">Cập nhật</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => {
                const status = statusLabels[d.status] ?? { label: d.status, variant: "outline" as const };
                return (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{d.fileName}</div>
                      {d.error && <div className="text-sm text-destructive">{d.error}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {d.status === "ready" && <div className="text-xs text-muted-foreground">{d.chunkCount} đoạn</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatBytes(d.sizeBytes)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDateTime(d.updatedAt)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(d)}>
                          Xóa
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
