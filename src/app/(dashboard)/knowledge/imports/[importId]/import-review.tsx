"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, CircleAlert, CircleCheck, FileUp, Lock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, LoadingRows } from "@/components/common/states";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type KnowledgeDiffItem, type KnowledgeImport, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTime, formatFieldValue } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { importStatus } from "../../history-tab";
import { decide, initialDecisions, lockedMissingKeys, plannedCounts, setAll, toSelections, type Decision, type Decisions } from "./selection";

type Section = { type: string; title: string; hint: string; tone: { bar: string; text: string } };

const sections: Section[] = [
  {
    type: "possibleDuplicate",
    title: "Có thể trùng — cần bạn quyết định",
    hint: "Mã khác nhưng tên gần giống một mục đang có. Thường là cùng một dịch vụ được đặt mã mới: chọn \"Gộp vào mục cũ\" để cập nhật mục cũ.",
    tone: { bar: "bg-warning", text: "text-warning" },
  },
  {
    type: "changed",
    title: "Thay đổi",
    hint: "Cùng mã, nội dung khác. Kiểm tra kỹ giá trước khi áp dụng.",
    tone: { bar: "bg-primary", text: "text-primary" },
  },
  { type: "added", title: "Thêm mới", hint: "Mã chưa có trong dữ liệu hiện tại.", tone: { bar: "bg-success", text: "text-success" } },
  {
    type: "missing",
    title: "Không còn trong file mới",
    hint: "Đang có nhưng file mới không có. Mặc định GIỮ LẠI; chỉ chọn những mục bạn chắc chắn muốn xóa.",
    tone: { bar: "bg-destructive", text: "text-destructive" },
  },
];

export function ImportReview({ importId }: { importId: string }) {
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const { data, problem, reload } = useApiData(() =>
    call(() => api.GET("/knowledge/imports/{importId}", { params: { path: { importId } } })),
  );

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-20 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <LoadingRows rows={6} columns={3} label="Đang tải bản so sánh" />
      </div>
    );
  }

  // key theo id + trạng thái: sau khi áp dụng/hủy, phần chọn được dựng lại từ dữ liệu mới.
  return (
    <Review
      key={`${data.id}-${data.status}`}
      data={data}
      isOwner={canEdit}
      canEdit={canEdit && data.status === "preview"}
      onChanged={reload}
    />
  );
}

function Review({ data, isOwner, canEdit, onChanged }: { data: KnowledgeImport; isOwner: boolean; canEdit: boolean; onChanged: () => void }) {
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
  const status = importStatus[data.status] ?? { label: data.status, variant: "secondary" as const };
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

  const summaryCells = [
    { type: "added", label: "Thêm mới", value: s.added, tone: "text-success" },
    { type: "changed", label: "Thay đổi", value: s.changed, tone: "text-primary" },
    { type: "possibleDuplicate", label: "Có thể trùng", value: s.possibleDuplicate, tone: "text-warning" },
    { type: "missing", label: "Không còn trong file", value: s.missing, tone: "text-destructive" },
    { type: null, label: "Giữ nguyên", value: s.unchanged, tone: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/knowledge?tab=history", label: "Lịch sử nhập" }}
        title="Duyệt nhập dữ liệu"
        meta={
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium break-all text-foreground">{data.fileName}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
            <span>Tạo lúc {formatDateTime(data.createdAt)}</span>
            {data.appliedAt && <span>· Áp dụng lúc {formatDateTime(data.appliedAt)}</span>}
          </div>
        }
        actions={
          data.status !== "preview" && (
            <Link href="/knowledge?tab=import" className={buttonVariants({ variant: "outline" })}>
              <FileUp aria-hidden />
              Nhập file khác
            </Link>
          )
        }
      />

      <nav aria-label="Tóm tắt thay đổi" className="grid grid-cols-2 overflow-hidden rounded-md border sm:grid-cols-5">
        {summaryCells.map((c) => {
          const jump = c.type && c.value > 0;
          const content = (
            <>
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <span className={cn("tabular text-2xl font-semibold tracking-tight", c.value ? c.tone : "text-muted-foreground/60")}>{c.value}</span>
            </>
          );
          const className = "-mt-px -ml-px flex flex-col gap-1 border-t border-l px-4 py-3";
          return jump ? (
            <a
              key={c.label}
              href={`#section-${c.type}`}
              className={cn(className, "transition-colors hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset")}
            >
              {content}
            </a>
          ) : (
            <div key={c.label} className={className}>
              {content}
            </div>
          );
        })}
      </nav>

      {result && (
        <Alert variant="success">
          <CircleCheck aria-hidden />
          <AlertTitle>Đã áp dụng</AlertTitle>
          <AlertDescription>
            {result.added} thêm mới, {result.updated} cập nhật, {result.merged} gộp, {result.deleted} xóa. Bot sẽ dùng dữ liệu mới sau khi chuẩn bị xong
            (vài giây đến vài phút).{" "}
            <Link href="/knowledge" className="font-medium text-primary">
              Xem dữ liệu
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {problem && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}

      {!isOwner && data.status === "preview" && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn đang xem với quyền nhân viên. Chỉ chủ doanh nghiệp được áp dụng thay đổi.</AlertDescription>
        </Alert>
      )}

      {items.length === 0 && (
        <div className="rounded-md border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          File không có gì khác so với dữ liệu hiện tại.
        </div>
      )}

      {sections.map((section) => {
        const sectionItems = items.filter((i) => i.type === section.type);
        if (sectionItems.length === 0) return null;
        const picked = sectionItems.filter((i) => (decisions[i.key] ?? "skip") !== "skip").length;
        return (
          <section key={section.type} id={`section-${section.type}`} className="scroll-mt-20 overflow-hidden rounded-md border">
            <div className="relative flex flex-col gap-3 border-b bg-muted/40 px-4 py-3 pl-5 sm:flex-row sm:items-start sm:justify-between">
              <span className={cn("absolute inset-y-0 left-0 w-1", section.tone.bar)} aria-hidden />
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
                  {section.title}
                  <span className={cn("tabular text-sm", section.tone.text)}>{sectionItems.length} mục</span>
                  {canEdit && <span className="tabular text-xs font-normal text-muted-foreground">· đã chọn {picked}</span>}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground">{section.hint}</p>
              </div>
              {canEdit && section.type !== "possibleDuplicate" && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDecisions(setAll(items, decisions, section.type, "apply"))}>
                    Chọn tất cả
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDecisions(setAll(items, decisions, section.type, "skip"))}>
                    Bỏ chọn
                  </Button>
                </div>
              )}
            </div>
            <ul className="divide-y">
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
            </ul>
          </section>
        );
      })}

      {canEdit && items.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-8 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Sẽ áp dụng:</span>
              <PlanCount label="thêm" value={counts.added} tone="text-success" />
              <PlanCount label="đổi" value={counts.updated} tone="text-primary" />
              <PlanCount label="gộp" value={counts.merged} tone="text-warning" />
              <PlanCount label="xóa" value={counts.deleted} tone="text-destructive" />
            </p>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setConfirm("discard")} disabled={busy}>
                Hủy lần nhập
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => setConfirm("apply")} disabled={busy || selections.length === 0}>
                Áp dụng {selections.length} mục
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>
        </div>
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

function PlanCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn("font-semibold", value ? tone : "text-muted-foreground")}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
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
  const willDelete = item.type === "missing" && decision === "apply";
  const skipped = decision === "skip";

  return (
    <li className={cn("px-4 py-3 transition-colors", willDelete && "bg-destructive/5")}>
      <div className="flex items-start gap-3">
        {item.type !== "possibleDuplicate" && (
          <Checkbox
            id={id}
            className="mt-0.5"
            checked={decision === "apply"}
            disabled={!canEdit || locked}
            onCheckedChange={(checked) => onDecide(checked === true ? "apply" : "skip")}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={id} className={cn("font-medium", item.type !== "possibleDuplicate" && canEdit && !locked && "cursor-pointer", skipped && canEdit && "text-muted-foreground")}>
            {item.title}
          </label>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{item.kindLabel}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">{item.code}</span>
            {willDelete && <Badge variant="destructive">Sẽ xóa</Badge>}
            {locked && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" aria-hidden />
                Đang được gộp với mục mới nên không xóa.
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="hidden sm:inline">{open ? "Thu gọn" : "Chi tiết"}</span>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />
          <span className="sr-only sm:hidden">{open ? "Thu gọn" : "Chi tiết"}</span>
        </Button>
      </div>

      {item.type === "possibleDuplicate" && (
        <RadioGroup
          className="mt-3 grid gap-2 md:grid-cols-3"
          value={decision}
          onValueChange={(v) => onDecide(v as Decision)}
          disabled={!canEdit}
          aria-label={`Xử lý mục có thể trùng ${item.title}`}
        >
          <Choice id={`${id}-merge`} value="merge" title="Gộp vào mục cũ">
            &quot;{item.existingTitle}&quot; ({item.existingCode}) — giống {Math.round((item.similarity ?? 0) * 100)}%
          </Choice>
          <Choice id={`${id}-keep`} value="keepBoth" title="Giữ cả hai">
            Thêm thành mục mới
          </Choice>
          <Choice id={`${id}-skip`} value="skip" title="Bỏ qua">
            Không đổi gì
          </Choice>
        </RadioGroup>
      )}

      {open && <Changes item={item} />}
    </li>
  );
}

function Choice({ id, value, title, children }: { id: string; value: Decision; title: string; children: ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 has-data-checked:border-primary has-data-checked:bg-accent has-disabled:cursor-default"
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{children}</span>
      </span>
    </label>
  );
}

function Changes({ item }: { item: KnowledgeDiffItem }) {
  if (item.changes.length === 0) return <p className="mt-2 pl-7 text-sm text-muted-foreground">Không có trường nào khác.</p>;
  const showOld = item.type !== "added";
  const showNew = item.type !== "missing";
  const oldLabel = item.type === "possibleDuplicate" ? "Mục cũ" : "Hiện tại";

  return (
    <div className="mt-3 overflow-x-auto rounded-md border sm:ml-7">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="text-left">
            <th className="w-40 px-3 py-2 font-medium">Trường</th>
            {showOld && <th className="px-3 py-2 font-medium">{oldLabel}</th>}
            {showOld && showNew && (
              <th className="w-6 px-0 py-2" aria-hidden>
                <span className="sr-only">thành</span>
              </th>
            )}
            {showNew && <th className="px-3 py-2 font-medium">Mới</th>}
          </tr>
        </thead>
        <tbody>
          {item.changes.map((c) => (
            <tr key={c.field} className="border-t align-top">
              <td className="px-3 py-2 text-muted-foreground">{c.label}</td>
              {showOld && (
                <td className="px-3 py-2 whitespace-pre-wrap">
                  <span className={showNew ? "text-muted-foreground line-through decoration-destructive/60" : undefined}>
                    {formatFieldValue(c.fieldType, c.old)}
                  </span>
                </td>
              )}
              {showOld && showNew && (
                <td className="px-0 py-2 text-muted-foreground" aria-hidden>
                  <ArrowRight className="mt-0.5 size-3.5" />
                </td>
              )}
              {showNew && (
                <td className="px-3 py-2 whitespace-pre-wrap">
                  <span className={showOld ? "rounded-sm bg-success/10 px-1 py-0.5 font-medium text-foreground" : undefined}>
                    {formatFieldValue(c.fieldType, c.new)}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
