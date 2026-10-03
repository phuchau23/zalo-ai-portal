"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type KnowledgeDiffItem, type KnowledgeImport, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTime, formatFieldValue } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { importStatus } from "../../history-tab";
import { decide, initialDecisions, lockedMissingKeys, plannedCounts, setAll, toSelections, type Decision, type Decisions } from "./selection";

const sections: { type: string; title: string; hint: string }[] = [
  {
    type: "possibleDuplicate",
    title: "Có thể trùng — cần bạn quyết định",
    hint: "Mã khác nhưng tên gần giống một mục đang có. Thường là cùng một dịch vụ được đặt mã mới: chọn \"Gộp vào mục cũ\" để cập nhật mục cũ.",
  },
  { type: "changed", title: "Thay đổi", hint: "Cùng mã, nội dung khác. Kiểm tra kỹ giá trước khi áp dụng." },
  { type: "added", title: "Thêm mới", hint: "Mã chưa có trong dữ liệu hiện tại." },
  {
    type: "missing",
    title: "Không còn trong file mới",
    hint: "Đang có nhưng file mới không có. Mặc định GIỮ LẠI; chỉ chọn những mục bạn chắc chắn muốn xóa.",
  },
];

export function ImportReview({ importId }: { importId: string }) {
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const { data, problem, reload } = useApiData(() =>
    call(() => api.GET("/knowledge/imports/{importId}", { params: { path: { importId } } })),
  );

  if (problem && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{problemMessage(problem)}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return <p className="text-muted-foreground">Đang tải...</p>;

  // key theo id + trạng thái: sau khi áp dụng/hủy, phần chọn được dựng lại từ dữ liệu mới.
  return <Review key={`${data.id}-${data.status}`} data={data} canEdit={canEdit && data.status === "preview"} onChanged={reload} />;
}

function Review({ data, canEdit, onChanged }: { data: KnowledgeImport; canEdit: boolean; onChanged: () => void }) {
  const items = data.items;
  const [decisions, setDecisions] = useState<Decisions>(() =>
    data.status === "preview"
      ? initialDecisions(items)
      : Object.fromEntries(items.map((i) => [i.key, data.selectedKeys.includes(i.key) ? "apply" : "skip"])),
  );
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [result, setResult] = useState<Schemas["KnowledgeApplyResponse"] | null>(null);
  const [confirm, setConfirm] = useState<"apply" | "discard" | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = lockedMissingKeys(items, decisions);
  const counts = plannedCounts(items, decisions);
  const selections = toSelections(items, decisions);
  const status = importStatus[data.status] ?? { label: data.status, variant: "outline" as const };
  const s = data.summary;

  async function apply() {
    setBusy(true);
    setProblem(null);
    const response = await call(() =>
      api.POST("/knowledge/imports/{importId}/apply", { params: { path: { importId: data.id } }, body: { selections } }),
    );
    setBusy(false);
    if (response.ok) {
      setResult(response.data);
      onChanged();
    } else {
      setProblem(response.problem);
    }
  }

  async function discard() {
    setBusy(true);
    const response = await call(() => api.POST("/knowledge/imports/{importId}/discard", { params: { path: { importId: data.id } } }));
    setBusy(false);
    if (response.ok) onChanged();
    else setProblem(response.problem);
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <Link href="/knowledge?tab=history" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Lịch sử nhập
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Duyệt nhập: {data.fileName}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Tạo lúc {formatDateTime(data.createdAt)}
          {data.appliedAt && ` · Áp dụng lúc ${formatDateTime(data.appliedAt)}`}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{s.added} thêm mới</Badge>
          <Badge variant="secondary">{s.changed} thay đổi</Badge>
          <Badge variant="secondary">{s.possibleDuplicate} có thể trùng</Badge>
          <Badge variant="secondary">{s.missing} không còn trong file</Badge>
          <Badge variant="outline">{s.unchanged} giữ nguyên</Badge>
        </div>
      </div>

      {result && (
        <Alert>
          <AlertTitle>Đã áp dụng</AlertTitle>
          <AlertDescription>
            {result.added} thêm mới, {result.updated} cập nhật, {result.merged} gộp, {result.deleted} xóa. Bot sẽ dùng dữ liệu mới sau khi chuẩn
            bị xong (vài giây đến vài phút).{" "}
            <Link href="/knowledge" className="underline underline-offset-4">
              Xem dữ liệu
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {problem && (
        <Alert variant="destructive">
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 && <p className="text-muted-foreground">File không có gì khác so với dữ liệu hiện tại.</p>}

      {sections.map((section) => {
        const sectionItems = items.filter((i) => i.type === section.type);
        if (sectionItems.length === 0) return null;
        return (
          <section key={section.type} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {section.title} ({sectionItems.length})
                </h2>
                <p className="text-sm text-muted-foreground">{section.hint}</p>
              </div>
              {canEdit && section.type !== "possibleDuplicate" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDecisions(setAll(items, decisions, section.type, "apply"))}>
                    Chọn tất cả
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDecisions(setAll(items, decisions, section.type, "skip"))}>
                    Bỏ chọn
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {sectionItems.map((item) => (
                <DiffRow
                  key={item.key}
                  item={item}
                  decision={decisions[item.key] ?? "skip"}
                  locked={locked.has(item.key)}
                  canEdit={canEdit}
                  onDecide={(d) => setDecisions(decide(items, decisions, item.key, d))}
                />
              ))}
            </div>
          </section>
        );
      })}

      {canEdit && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-3 backdrop-blur md:left-52">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <p className="text-sm">
              Sẽ áp dụng: <strong>{counts.added}</strong> thêm · <strong>{counts.updated}</strong> đổi · <strong>{counts.merged}</strong> gộp ·{" "}
              <strong className={counts.deleted ? "text-destructive" : undefined}>{counts.deleted}</strong> xóa
            </p>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setConfirm("discard")} disabled={busy}>
                Hủy lần nhập
              </Button>
              <Button onClick={() => setConfirm("apply")} disabled={busy || selections.length === 0}>
                Áp dụng {selections.length} mục
              </Button>
            </div>
          </div>
        </div>
      )}

      {!canEdit && data.status === "preview" && (
        <p className="text-sm text-muted-foreground">Chỉ chủ doanh nghiệp được áp dụng thay đổi.</p>
      )}

      {data.status !== "preview" && (
        <Link href="/knowledge?tab=import" className={buttonVariants({ variant: "outline" })}>
          Nhập file khác
        </Link>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "apply" ? "Áp dụng thay đổi?" : "Hủy lần nhập này?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "apply"
                ? `${counts.added} thêm mới, ${counts.updated} cập nhật, ${counts.merged} gộp, ${counts.deleted} xóa. Bot sẽ trả lời khách theo dữ liệu mới.`
                : "Dữ liệu hiện tại giữ nguyên. Muốn nhập lại thì chọn file lần nữa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm === "discard" ? "destructive" : "default"}
              onClick={() => {
                if (confirm === "apply") void apply();
                if (confirm === "discard") void discard();
                setConfirm(null);
              }}
            >
              {confirm === "apply" ? "Áp dụng" : "Hủy lần nhập"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DiffRow({
  item,
  decision,
  locked,
  canEdit,
  onDecide,
}: {
  item: KnowledgeDiffItem;
  decision: Decision;
  locked: boolean;
  canEdit: boolean;
  onDecide: (d: Decision) => void;
}) {
  const [open, setOpen] = useState(item.type === "changed" || item.type === "possibleDuplicate");
  const id = `pick-${item.key}`;

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start gap-3">
        {item.type !== "possibleDuplicate" && (
          <Checkbox
            id={id}
            className="mt-1"
            checked={decision === "apply"}
            disabled={!canEdit || locked}
            onCheckedChange={(checked) => onDecide(checked === true ? "apply" : "skip")}
            aria-label={`Chọn ${item.title}`}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={id} className="font-medium">
            {item.title}
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{item.kindLabel}</Badge>
            <span className="font-mono">{item.code}</span>
            {item.type === "missing" && decision === "apply" && <Badge variant="destructive">Sẽ xóa</Badge>}
            {locked && <span>Đang được gộp với mục mới nên không xóa.</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Thu gọn" : "Xem chi tiết"}
        </Button>
      </div>

      {item.type === "possibleDuplicate" && (
        <RadioGroup
          className="mt-3 gap-2 pl-1"
          value={decision}
          onValueChange={(v) => onDecide(v as Decision)}
          disabled={!canEdit}
          aria-label={`Xử lý mục có thể trùng ${item.title}`}
        >
          <div className="flex items-start gap-2">
            <RadioGroupItem value="merge" id={`${id}-merge`} />
            <Label htmlFor={`${id}-merge`} className="font-normal">
              Gộp vào mục cũ &quot;{item.existingTitle}&quot; ({item.existingCode}) — giống {Math.round((item.similarity ?? 0) * 100)}%
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="keepBoth" id={`${id}-keep`} />
            <Label htmlFor={`${id}-keep`} className="font-normal">
              Giữ cả hai (thêm thành mục mới)
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="skip" id={`${id}-skip`} />
            <Label htmlFor={`${id}-skip`} className="font-normal">
              Bỏ qua
            </Label>
          </div>
        </RadioGroup>
      )}

      {open && <Changes item={item} />}
    </div>
  );
}

function Changes({ item }: { item: KnowledgeDiffItem }) {
  if (item.changes.length === 0) return <p className="mt-2 text-sm text-muted-foreground">Không có trường nào khác.</p>;
  const showOld = item.type !== "added";
  const showNew = item.type !== "missing";
  const oldLabel = item.type === "possibleDuplicate" ? "Mục cũ" : "Hiện tại";

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-normal">Trường</th>
            {showOld && <th className="py-1 pr-3 font-normal">{oldLabel}</th>}
            {showNew && <th className="py-1 font-normal">Mới</th>}
          </tr>
        </thead>
        <tbody>
          {item.changes.map((c) => (
            <tr key={c.field} className="border-t align-top">
              <td className="py-2 pr-3 text-muted-foreground">{c.label}</td>
              {showOld && (
                <td className="whitespace-pre-wrap py-2 pr-3">
                  <span className={showNew ? "rounded bg-destructive/10 px-1 line-through decoration-destructive/60" : undefined}>
                    {formatFieldValue(c.fieldType, c.old)}
                  </span>
                </td>
              )}
              {showNew && (
                <td className="whitespace-pre-wrap py-2">
                  <span className={showOld ? "rounded bg-primary/10 px-1 font-medium" : undefined}>{formatFieldValue(c.fieldType, c.new)}</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
