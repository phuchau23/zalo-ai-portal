"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Banknote,
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  History,
  Landmark,
  LoaderCircle,
  Lock,
  LockOpen,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { Field } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type CashShift } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTime, formatMoney } from "@/lib/format";
import { shiftDifference } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/** Ca thu ngân của một chi nhánh: ca đang mở (hoặc form mở ca), chốt ca, lịch sử. */
export function CashShiftSection({ branchId }: { branchId: string }) {
  const current = useApiData<CashShift | null>(() =>
    call(async () => {
      const r = await api.GET("/cash-shifts/current", { params: { query: { branchId } } });
      // 204 = chưa có ca → data undefined; đổi thành null để phân biệt với "đang tải".
      return { ...r, data: r.response.status === 204 ? null : (r.data ?? null) };
    }),
  );
  const history = useApiData(() => call(() => api.GET("/cash-shifts", { params: { query: { branchId, limit: 30 } } })));
  useEffect(() => {
    current.reload();
    history.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const [closing, setClosing] = useState(false);
  const [justClosed, setJustClosed] = useState<CashShift | null>(null);

  function changed() {
    current.reload();
    history.reload();
  }

  const shift = current.data;

  return (
    <div className="flex flex-col gap-6">
      {current.problem && !current.loading ? (
        <ErrorState problem={current.problem} onRetry={current.reload} />
      ) : current.loading && shift === undefined ? (
        <LoadingRows rows={2} columns={3} label="Đang tải ca thu ngân" />
      ) : shift ? (
        <section className="surface relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl p-5">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full bg-success/10 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconTile icon={LockOpen} tone="success" variant="solid" size="lg" />
              <div className="flex flex-col gap-0.5">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  Ca đang mở
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
                    <span className="relative size-2 rounded-full bg-success" />
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground tabular">
                  Mở lúc {formatDateTime(shift.openedAt)} · Tiền đầu ca {formatMoney(shift.openingCash)}
                </p>
              </div>
            </div>
            <Button className="h-11 sm:h-9" onClick={() => setClosing(true)}>
              <Lock aria-hidden />
              Chốt ca
            </Button>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-success/20 bg-success/[0.06] px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">Tiền mặt dự kiến trong két</span>
            <span className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={shift.openingCash + shift.cashIn - shift.cashOut} format={formatMoney} />
            </span>
            <span className="text-xs text-muted-foreground">= đầu ca + thu tiền mặt − chi tiền mặt</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Thu tiền mặt" value={formatMoney(shift.cashIn)} icon={Banknote} />
            <Stat label="Chi tiền mặt" value={formatMoney(shift.cashOut)} icon={ArrowUpRight} />
            <Stat label="Chuyển khoản" value={formatMoney(shift.transfer)} icon={Landmark} />
            <Stat label="Thẻ" value={formatMoney(shift.card)} icon={CreditCard} />
            <Stat label="Thẻ trả trước" value={formatMoney(shift.wallet)} icon={Wallet} />
            <Stat label="Hóa đơn" value={String(shift.invoiceCount)} icon={Receipt} />
          </dl>
        </section>
      ) : (
        <OpenShiftForm branchId={branchId} onOpened={changed} />
      )}

      {justClosed && <ClosedSummary shift={justClosed} onDismiss={() => setJustClosed(null)} />}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Lịch sử ca" description="30 ca gần nhất của chi nhánh; cột Lệch so tiền đếm được với dự kiến." icon={History} />
        {history.problem && !history.data ? (
          <ErrorState problem={history.problem} onRetry={history.reload} />
        ) : !history.data ? (
          <LoadingRows rows={3} columns={5} label="Đang tải lịch sử ca" />
        ) : history.data.length === 0 ? (
          <EmptyState icon={Clock} title="Chưa có ca nào" description="Mở ca đầu ngày với số tiền mặt trong két, cuối ngày chốt ca để đối chiếu." />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mở</TableHead>
                  <TableHead>Chốt</TableHead>
                  <TableHead className="text-right">Đầu ca</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Tiền mặt thu</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Chuyển khoản</TableHead>
                  <TableHead className="text-right">Dự kiến</TableHead>
                  <TableHead className="text-right">Đếm được</TableHead>
                  <TableHead className="text-right">Lệch</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">HĐ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((s) => {
                  const diff = shiftDifference(s.expectedCash, s.countedCash);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="tabular whitespace-nowrap">{formatDateTime(s.openedAt)}</TableCell>
                      <TableCell className="tabular whitespace-nowrap">{s.closedAt ? formatDateTime(s.closedAt) : <Badge variant="success">Đang mở</Badge>}</TableCell>
                      <TableCell className="tabular text-right">{formatMoney(s.openingCash)}</TableCell>
                      <TableCell className="tabular hidden text-right sm:table-cell">{formatMoney(s.cashIn)}</TableCell>
                      <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(s.transfer)}</TableCell>
                      <TableCell className="tabular text-right">{s.expectedCash === null ? "—" : formatMoney(s.expectedCash)}</TableCell>
                      <TableCell className="tabular text-right">{s.countedCash === null ? "—" : formatMoney(s.countedCash)}</TableCell>
                      <TableCell className="tabular text-right">
                        {diff === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : diff === 0 ? (
                          <Badge variant="success">Khớp</Badge>
                        ) : (
                          <Badge variant="destructive">{`${diff > 0 ? "+" : "−"}${formatMoney(Math.abs(diff))}`}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular hidden text-right lg:table-cell">{s.invoiceCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {shift && closing && (
        <CloseShiftDialog
          shift={shift}
          onClose={() => setClosing(false)}
          onClosed={(s) => {
            setClosing(false);
            setJustClosed(s);
            changed();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-muted/30 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}

function OpenShiftForm({ branchId, onOpened }: { branchId: string; onOpened: () => void }) {
  const [openingCash, setOpeningCash] = useState("0");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.POST("/cash-shifts", { body: { branchId, openingCash: Math.max(0, Math.trunc(Number(openingCash) || 0)) } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onOpened();
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="surface relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl p-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
      <div className="flex items-start gap-3">
        <IconTile icon={Lock} tone="muted" size="lg" />
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Chưa có ca nào đang mở</h2>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">
            Mở ca với số tiền mặt đang có trong két. Hóa đơn vẫn lập được khi chưa mở ca; mở ca để cuối ngày đối chiếu tiền.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field id="shift-opening" label="Tiền mặt đầu ca" error={problem?.fieldErrors.openingCash} className="sm:w-60">
          <Input
            id="shift-opening"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={openingCash}
            disabled={saving}
            onChange={(e) => setOpeningCash(e.target.value)}
            aria-invalid={Boolean(problem?.fieldErrors.openingCash)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Button type="submit" className="h-11 sm:h-9" disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <LockOpen aria-hidden />}
          {saving ? "Đang mở..." : "Mở ca"}
        </Button>
      </div>
      {problem && !problem.fieldErrors.openingCash && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
    </form>
  );
}

function CloseShiftDialog({ shift, onClose, onClosed }: { shift: CashShift; onClose: () => void; onClosed: (shift: CashShift) => void }) {
  const expected = shift.openingCash + shift.cashIn - shift.cashOut;
  const [countedCash, setCountedCash] = useState(String(expected));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const diff = shiftDifference(expected, Number(countedCash) || 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/cash-shifts/{shiftId}/close", { params: { path: { shiftId: shift.id } }, body: { countedCash: Math.max(0, Math.trunc(Number(countedCash) || 0)), note: note.trim() || null } }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onClosed(result.data);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chốt ca</DialogTitle>
          <DialogDescription>Đếm tiền mặt trong két và nhập vào; hệ thống so với số dự kiến {formatMoney(expected)}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <Field id="shift-counted" label="Tiền mặt đếm được" error={problem?.fieldErrors.countedCash}>
            <Input
              id="shift-counted"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={countedCash}
              disabled={saving}
              onChange={(e) => setCountedCash(e.target.value)}
              aria-invalid={Boolean(problem?.fieldErrors.countedCash)}
              className="h-11 sm:h-9"
            />
          </Field>
          {diff !== null && (
            <p className={cn("text-sm font-medium", diff === 0 ? "text-success" : "text-warning")}>
              {diff === 0 ? "Khớp với dự kiến." : diff > 0 ? `Thừa ${formatMoney(diff)} so với dự kiến.` : `Thiếu ${formatMoney(-diff)} so với dự kiến.`}
            </p>
          )}
          <Field id="shift-note" label="Ghi chú" error={problem?.fieldErrors.note}>
            <Textarea id="shift-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} placeholder="Lý do lệch, chi lặt vặt..." />
          </Field>
          {problem && !Object.keys(problem.fieldErrors).length && (
            <p role="alert" className="text-sm text-destructive">
              {problemMessage(problem)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang chốt..." : "Chốt ca"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClosedSummary({ shift, onDismiss }: { shift: CashShift; onDismiss: () => void }) {
  const diff = shiftDifference(shift.expectedCash, shift.countedCash);
  return (
    <div role="status" className="flex flex-col gap-2 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <CircleCheck className="size-4 text-success" aria-hidden />
        Đã chốt ca lúc {formatDateTime(shift.closedAt)}.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-muted-foreground">Dự kiến</dt>
        <dd className="tabular">{formatMoney(shift.expectedCash)}</dd>
        <dt className="text-muted-foreground">Đếm được</dt>
        <dd className="tabular">{formatMoney(shift.countedCash)}</dd>
        <dt className="text-muted-foreground">Lệch</dt>
        <dd className={cn("tabular font-medium", diff === 0 ? "text-success" : "text-destructive")}>
          {diff === null ? "—" : diff === 0 ? "Khớp" : `${diff > 0 ? "+" : "−"}${formatMoney(Math.abs(diff))}`}
        </dd>
      </dl>
      <Button variant="ghost" size="sm" className="h-9 w-fit" onClick={onDismiss}>
        Đóng
      </Button>
    </div>
  );
}
