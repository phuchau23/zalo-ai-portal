"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, CircleAlert, Copy, FileSpreadsheet, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { SectionHeader } from "@/components/common/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type KnowledgeImport } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { uploadFile } from "@/lib/api/upload";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { DownloadButtons } from "./download-buttons";
import { DropZone } from "./drop-zone";

const steps = [
  { title: "Tải file mẫu", text: "Hoặc bấm Xuất Excel để lấy dữ liệu đang có." },
  { title: "Điền / sửa trong Excel", text: "Giữ nguyên cột Mã để hệ thống nhận ra mục cũ." },
  { title: "Nhập file lên", text: "Hệ thống chưa đổi gì ngay." },
  { title: "Duyệt và áp dụng", text: "Xem thêm mới, thay đổi, trùng — chọn từng mục." },
];

export function ImportTab({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function onFile(file: File) {
    setUploading(true);
    setProblem(null);
    const result = await uploadFile<KnowledgeImport>("/knowledge/imports", file);
    setUploading(false);

    if (result.ok) {
      router.push(`/knowledge/imports/${result.data.id}`);
    } else {
      setProblem(result.problem);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <motion.ol
          variants={stagger}
          initial="hidden"
          animate="show"
          aria-label="Các bước nhập dữ liệu"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step, i) => (
            <motion.li key={step.title} variants={fadeUp} className="surface relative flex gap-3 p-4">
              <span
                className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-active-gradient text-sm font-bold text-white shadow-glow"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  <span className="sr-only">Bước {i + 1}: </span>
                  {step.title}
                </span>
                <span className="text-xs text-pretty text-muted-foreground">{step.text}</span>
              </div>
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute top-1/2 -right-2.5 z-10 hidden h-px w-2 bg-primary/30 lg:block" />
              )}
            </motion.li>
          ))}
        </motion.ol>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-3">
            {canEdit ? (
              <DropZone
                accept=".xlsx,.json"
                formats="Excel (.xlsx) hoặc JSON theo mẫu"
                busy={uploading}
                busyLabel="Đang đọc file..."
                onFile={(file) => void onFile(file)}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed bg-card px-5 py-10 text-sm text-muted-foreground">
                <IconTile icon={Lock} tone="muted" size="md" />
                Chỉ chủ doanh nghiệp được nhập dữ liệu. Bạn vẫn tải được file mẫu và xuất dữ liệu.
              </div>
            )}
            {problem && <ImportErrors problem={problem} />}
          </div>

          <aside className="surface flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={FileSpreadsheet} tone="success" size="md" />
              <h3 className="text-sm font-semibold">Lấy file để điền</h3>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
              File mẫu có sẵn các sheet Dịch vụ, Gói liệu trình, Sản phẩm, Câu hỏi thường gặp, Chính sách. Muốn sửa dữ liệu đang có: xuất Excel, sửa, rồi
              nhập lại.
            </p>
            <div className="mt-auto flex flex-col gap-2 [&>a]:justify-start">
              <DownloadButtons />
            </div>
          </aside>
        </div>
      </section>

      <AiPrompt />
    </div>
  );
}

function ImportErrors({ problem }: { problem: ApiProblem }) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle>{problemMessage(problem)}</AlertTitle>
      {problem.fileErrors.length > 0 && (
        <AlertDescription>
          <p className="mb-2">Sửa các ô dưới đây trong file rồi nhập lại ({problem.fileErrors.length} lỗi).</p>
          <div className="max-h-80 w-full overflow-auto rounded-md border bg-background text-foreground">
            <Table>
              <TableHeader className="sticky top-0">
                <TableRow>
                  <TableHead>Sheet / nhóm</TableHead>
                  <TableHead className="text-right">Dòng</TableHead>
                  <TableHead>Cột</TableHead>
                  <TableHead>Lỗi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problem.fileErrors.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.location}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{e.row ?? "—"}</TableCell>
                    <TableCell>{e.column ? <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">{e.column}</span> : "—"}</TableCell>
                    <TableCell className="whitespace-normal text-destructive">{e.message}</TableCell>
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

function AiPrompt() {
  const { data } = useApiData(() => call(() => api.GET("/knowledge/ai-prompt")));
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.prompt);
    setCopied(true);
  }

  return (
    <section className="surface relative flex flex-col gap-4 overflow-hidden p-5 md:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-ai/10 blur-3xl" />
      <SectionHeader
        icon={Sparkles}
        tone="ai"
        className="relative"
        title="Nhờ AI chuyển tài liệu có sẵn sang mẫu"
        description={
          <>
            Có bảng giá dạng ảnh, Word, hoặc nội dung trên website? Mở ChatGPT, Claude hoặc Gemini, dán câu lệnh dưới đây kèm tài liệu của bạn, lưu
            kết quả thành file <code className="rounded-sm bg-muted px-1 font-mono text-xs">.json</code> rồi nhập ở trên. Luôn kiểm tra lại giá trong
            bản so sánh — AI có thể đọc sai.
          </>
        }
        actions={
          <Button variant="outline" onClick={() => void copy()} disabled={!data} aria-live="polite">
            {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Đã sao chép" : "Sao chép câu lệnh"}
          </Button>
        }
      />
      <Alert variant="warning">
        <ShieldCheck aria-hidden />
        <AlertDescription className="text-foreground">
          Chỉ đưa cho AI bên ngoài tài liệu công khai (bảng giá, dịch vụ, câu hỏi thường gặp). Không đưa danh sách khách hàng, số điện thoại, hồ sơ
          bệnh.
        </AlertDescription>
      </Alert>
      <Textarea
        readOnly
        value={data?.prompt ?? "Đang tải..."}
        rows={10}
        className="scrollbar-thin relative max-h-80 rounded-xl bg-muted/40 font-mono text-xs leading-relaxed"
        aria-label="Câu lệnh mẫu cho AI"
      />
    </section>
  );
}
