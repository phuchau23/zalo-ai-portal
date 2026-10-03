"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type KnowledgeImport } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { uploadFile } from "@/lib/api/upload";
import { useApiData } from "@/lib/use-api-data";
import { DownloadButtons } from "./download-buttons";

export function ImportTab({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setProblem(null);
    const result = await uploadFile<KnowledgeImport>("/knowledge/imports", file);
    setUploading(false);
    if (input.current) input.current.value = "";

    if (result.ok) {
      router.push(`/knowledge/imports/${result.data.id}`);
    } else {
      setProblem(result.problem);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Nhập file theo mẫu</CardTitle>
          <CardDescription>
            Nhận file Excel (.xlsx) hoặc JSON theo mẫu. Hệ thống <strong>chưa đổi gì ngay</strong>: bạn sẽ thấy bản so sánh với dữ liệu đang
            có (thêm mới, thay đổi, có thể trùng, không còn trong file) và chọn từng mục trước khi áp dụng.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <input
                  ref={input}
                  type="file"
                  accept=".xlsx,.json"
                  className="sr-only"
                  id="knowledge-import-file"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                <Button onClick={() => input.current?.click()} disabled={uploading}>
                  {uploading ? "Đang đọc file..." : "Chọn file để nhập"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chỉ chủ doanh nghiệp được nhập dữ liệu.</p>
            )}
            <DownloadButtons />
          </div>
          <p className="text-sm text-muted-foreground">
            Muốn sửa dữ liệu đang có: bấm <strong>Xuất Excel</strong>, sửa trong file (giữ nguyên cột Mã), rồi nhập lại.
          </p>

          {problem && <ImportErrors problem={problem} />}
        </CardContent>
      </Card>

      <AiPromptCard />
    </div>
  );
}

function ImportErrors({ problem }: { problem: ApiProblem }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{problemMessage(problem)}</AlertTitle>
      {problem.fileErrors.length > 0 && (
        <AlertDescription>
          <div className="mt-2 max-h-80 w-full overflow-auto rounded-md border bg-background text-foreground">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sheet / nhóm</TableHead>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Cột</TableHead>
                  <TableHead>Lỗi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problem.fileErrors.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.location}</TableCell>
                    <TableCell>{e.row ?? ""}</TableCell>
                    <TableCell>{e.column ?? ""}</TableCell>
                    <TableCell className="whitespace-normal">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AlertDescription>
      )}
    </Alert>
  );
}

function AiPromptCard() {
  const { data } = useApiData(() => call(() => api.GET("/knowledge/ai-prompt")));
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.prompt);
    setCopied(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhờ AI chuyển tài liệu có sẵn sang mẫu</CardTitle>
        <CardDescription>
          Có bảng giá dạng ảnh, Word, hoặc nội dung trên website? Mở ChatGPT, Claude hoặc Gemini, dán câu lệnh dưới đây kèm tài liệu của bạn,
          lưu kết quả thành file <code>.json</code> rồi nhập ở trên. Luôn kiểm tra lại giá trong bản so sánh — AI có thể đọc sai.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Alert>
          <AlertDescription>
            Chỉ đưa cho AI bên ngoài tài liệu công khai (bảng giá, dịch vụ, câu hỏi thường gặp). Không đưa danh sách khách hàng, số điện
            thoại, hồ sơ bệnh.
          </AlertDescription>
        </Alert>
        <Textarea readOnly value={data?.prompt ?? "Đang tải..."} rows={10} className="font-mono text-xs" aria-label="Câu lệnh mẫu cho AI" />
        <div>
          <Button variant="outline" size="sm" onClick={() => void copy()} disabled={!data}>
            {copied ? "Đã sao chép" : "Sao chép câu lệnh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
