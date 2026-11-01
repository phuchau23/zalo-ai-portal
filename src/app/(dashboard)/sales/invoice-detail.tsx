"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Ban, CircleAlert, CircleCheck, ExternalLink, LoaderCircle, Pencil, QrCode, Receipt, RotateCcw, Send, UserRound, Wallet } from "lucide-react";
import { CopyButton } from "@/components/common/copy-button";
import { Field } from "@/components/common/field";
import { ErrorState } from "@/components/common/states";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type Invoice, type StaffMember, type TransferQr, type Wallet as WalletInfo } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { hasPermission } from "@/lib/crm";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  invoiceStatusOf,
  lineKindLabel,
  nextInvoiceActions,
  paymentMethodLabel,
  paymentMethods,
  refundMethods,
  type InvoiceAction,
  type PaymentMethod,
} from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { InvoiceEditorDialog } from "./invoice-editor";

/**
 * Chi tiết hóa đơn: dòng, giảm giá, tổng, thanh toán, thu tiền, mã QR chuyển khoản, phiếu thu, hủy, hoàn tiền.
 * Tự tải theo `invoiceId`; sửa dòng (khi chưa thu) mở lại hộp thoại soạn hóa đơn.
 */
export function InvoiceDetailDialog({ invoiceId, onClose, onChanged }: { invoiceId: string; onClose: () => void; onChanged?: () => void }) {
  const { me } = useSession();
  const permissions = { canVoid: hasPermission(me.currentTenant, "void_invoice"), canRefund: hasPermission(me.currentTenant, "refund") };
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/invoices/{invoiceId}", { params: { path: { invoiceId } } })));
  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: true } } })));
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const inv = data ?? null;
  const actions = inv ? nextInvoiceActions(inv.status, permissions, { total: inv.total, due: inv.due, paidAmount: inv.paidAmount }) : [];
  const can = (a: InvoiceAction) => actions.includes(a);
  const status = inv ? invoiceStatusOf(inv.status) : null;

  function changed() {
    reload();
    onChanged?.();
  }

  async function act(request: () => Promise<ApiResult<unknown>>): Promise<boolean> {
    setActionProblem(null);
    setBusy(true);
    const result = await request();
    setBusy(false);
    if (!result.ok) setActionProblem(result.problem);
    changed();
    return result.ok;
  }

  const closeZero = () => act(() => call(() => api.POST("/invoices/{invoiceId}/close-zero", { params: { path: { invoiceId } } })));

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        {problem && !data ? (
          <>
            <DialogHeader>
              <DialogTitle>Hóa đơn</DialogTitle>
              <DialogDescription>Không tải được chi tiết.</DialogDescription>
            </DialogHeader>
            <ErrorState problem={problem} onRetry={reload} />
          </>
        ) : !inv || !status ? (
          <>
            <DialogHeader>
              <DialogTitle>Hóa đơn</DialogTitle>
              <DialogDescription>Đang tải chi tiết...</DialogDescription>
            </DialogHeader>
            <div role="status" aria-label="Đang tải hóa đơn" className="h-64 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          </>
        ) : (
          <div className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{inv.number}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{inv.branchName}</span>
                <span>· Lập lúc {formatDateTime(inv.issuedAt)}</span>
                {inv.paidAt && <span>· Thu đủ lúc {formatDateTime(inv.paidAt)}</span>}
              </DialogDescription>
            </DialogHeader>

            {actionProblem && (
              <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                {problemMessage(actionProblem)}
              </p>
            )}

            {inv.voidReason && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <span className="font-medium">Lý do hủy:</span> {inv.voidReason}
                {inv.voidedAt && <span className="text-muted-foreground"> · {formatDateTime(inv.voidedAt)}</span>}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {inv.contactId ? (
                <Link
                  href={`/customers/${inv.contactId}`}
                  className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-9"
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{inv.contactName ?? "Khách"}</span>
                    {inv.contactPhone && <span className="text-muted-foreground"> · {inv.contactPhone}</span>}
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ) : (
                <p className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="size-4" aria-hidden />
                  Khách lẻ (không lưu hồ sơ)
                </p>
              )}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Thao tác">
                {can("edit") && (
                  <Button size="sm" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setEditing(true)}>
                    <Pencil aria-hidden />
                    Sửa dòng
                  </Button>
                )}
                {can("close_zero") && (
                  <Button size="sm" className="h-11 sm:h-9" disabled={busy} onClick={() => void closeZero()}>
                    <CircleCheck aria-hidden />
                    Chốt (0 đ)
                  </Button>
                )}
                {can("receipt") && (
                  <Button size="sm" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setReceiptOpen(true)}>
                    <Receipt aria-hidden />
                    Phiếu thu
                  </Button>
                )}
                {can("refund") && (
                  <Button size="sm" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setRefundOpen(true)}>
                    <RotateCcw aria-hidden />
                    Hoàn tiền
                  </Button>
                )}
                {can("void") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
                    disabled={busy}
                    onClick={() => setVoidOpen(true)}
                  >
                    <Ban aria-hidden />
                    Hủy hóa đơn
                  </Button>
                )}
              </div>
            </div>

            <LinesTable invoice={inv} staff={staff.data ?? []} />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                {can("discount") && <DiscountForm invoice={inv} busy={busy} onDone={changed} />}
                {inv.note && (
                  <section className="flex flex-col gap-1 text-sm">
                    <h3 className="font-semibold">Ghi chú</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{inv.note}</p>
                  </section>
                )}
                <Payments invoice={inv} />
              </div>
              <div className="flex flex-col gap-4">
                <Totals invoice={inv} />
                {can("pay") && <PaymentForm key={`${inv.due}-${inv.paidAmount}`} invoice={inv} busy={busy} onDone={changed} onQr={() => setQrOpen(true)} />}
              </div>
            </div>
          </div>
        )}

        {inv && editing && (
          <InvoiceEditorDialog
            mode={{ kind: "edit", invoice: inv }}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              changed();
            }}
          />
        )}
        {inv && qrOpen && <TransferQrDialog invoiceId={inv.id} amount={inv.due} onClose={() => setQrOpen(false)} />}
        {inv && receiptOpen && <ReceiptDialog invoiceId={inv.id} hasContact={Boolean(inv.contactId)} onClose={() => setReceiptOpen(false)} onSent={changed} />}
        {inv && voidOpen && <VoidDialog invoiceId={inv.id} number={inv.number} onClose={() => setVoidOpen(false)} onDone={changed} />}
        {inv && refundOpen && <RefundDialog invoice={inv} onClose={() => setRefundOpen(false)} onDone={changed} />}
      </DialogContent>
    </Dialog>
  );
}

function LinesTable({ invoice, staff }: { invoice: Invoice; staff: StaffMember[] }) {
  const performer = (id: string | null) => (id ? (staff.find((s) => s.id === id)?.displayName ?? "(đã nghỉ)") : null);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Các dòng ({invoice.lines.length})</h3>
      <ul className="flex flex-col divide-y rounded-md border text-sm">
        {invoice.lines.map((l) => {
          const who = performer(l.performerStaffId);
          return (
            <li key={l.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{l.description}</span>
                <span className="text-xs text-muted-foreground">
                  {lineKindLabel(l.kind)}
                  {who && ` · ${who}`}
                </span>
              </div>
              <span className="tabular text-xs text-muted-foreground sm:w-40 sm:text-right">
                {l.quantity} × {formatMoney(l.unitPrice)}
                {l.discount > 0 && <span className="text-destructive"> − {formatMoney(l.discount)}</span>}
              </span>
              <span className="tabular font-medium sm:w-28 sm:text-right">{formatMoney(l.lineTotal)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Totals({ invoice: inv }: { invoice: Invoice }) {
  const row = (label: string, value: number, className?: string) => (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{formatMoney(value)}</dd>
    </div>
  );
  return (
    <section className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm">
      <dl className="flex flex-col gap-1">
        {row("Tạm tính", inv.subtotal)}
        {inv.discountAmount > 0 && (
          <div className="flex items-center justify-between gap-3 text-destructive">
            <dt>
              Giảm giá
              {inv.discountReason && <span className="text-xs text-muted-foreground"> · {inv.discountReason}</span>}
            </dt>
            <dd className="tabular">− {formatMoney(inv.discountAmount)}</dd>
          </div>
        )}
        {inv.voucherAmount > 0 && (
          <div className="flex items-center justify-between gap-3 text-destructive">
            <dt>
              Voucher <span className="font-mono text-xs">{inv.voucherCode}</span>
            </dt>
            <dd className="tabular">− {formatMoney(inv.voucherAmount)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-1 text-base font-semibold">
          <dt>Tổng</dt>
          <dd className="tabular">{formatMoney(inv.total)}</dd>
        </div>
        {row("Đã thu", inv.paidAmount)}
        {inv.refundedAmount > 0 && row("Đã hoàn", inv.refundedAmount)}
        <div className={cn("flex items-center justify-between gap-3 font-medium", inv.due > 0 ? "text-warning" : "text-success")}>
          <dt>Còn phải thu</dt>
          <dd className="tabular">{formatMoney(inv.due)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Payments({ invoice }: { invoice: Invoice }) {
  if (invoice.payments.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Thanh toán</h3>
      <ul className="flex flex-col divide-y rounded-md border text-sm">
        {invoice.payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
            <span className="font-medium">{paymentMethodLabel(p.method)}</span>
            {p.reference && <span className="text-xs text-muted-foreground">{p.reference}</span>}
            <span className="text-xs text-muted-foreground">{formatDateTime(p.receivedAt)}</span>
            <span className={cn("tabular ml-auto font-medium", p.method === "refund" && "text-destructive")}>
              {p.method === "refund" ? "− " : ""}
              {formatMoney(Math.abs(p.amount))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DiscountForm({ invoice, busy, onDone }: { invoice: Invoice; busy: boolean; onDone: () => void }) {
  const [amount, setAmount] = useState(String(invoice.discountAmount || ""));
  const [reason, setReason] = useState(invoice.discountReason ?? "");
  const [voucherCode, setVoucherCode] = useState(invoice.voucherCode ?? "");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [saved, setSaved] = useState(false);
  const errors = problem?.fieldErrors ?? {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    setSaved(false);
    const result = await call(() =>
      api.POST("/invoices/{invoiceId}/discount", {
        params: { path: { invoiceId: invoice.id } },
        body: { amount: Math.max(0, Math.trunc(Number(amount) || 0)), reason: reason.trim() || null, voucherCode: voucherCode.trim() || null },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setSaved(true);
    onDone();
  }

  const message = problem ? (problem.status === 403 ? "Giảm vượt mức cho phép, cần chủ duyệt." : problemMessage(problem)) : null;

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-3 rounded-md border p-3">
      <h3 className="text-sm font-semibold">Giảm giá</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="inv-discount" label="Giảm (đ)" error={errors.amount}>
          <Input
            id="inv-discount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={amount}
            disabled={saving || busy}
            onChange={(e) => {
              setAmount(e.target.value);
              setSaved(false);
            }}
            aria-invalid={Boolean(errors.amount)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id="inv-voucher" label="Mã voucher" error={errors.voucherCode}>
          <Input
            id="inv-voucher"
            value={voucherCode}
            maxLength={40}
            disabled={saving || busy}
            onChange={(e) => {
              setVoucherCode(e.target.value.toUpperCase());
              setSaved(false);
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.voucherCode)}
            className="h-11 font-mono uppercase sm:h-9"
          />
        </Field>
      </div>
      <Field id="inv-discount-reason" label="Lý do giảm" error={errors.reason}>
        <Input
          id="inv-discount-reason"
          value={reason}
          maxLength={200}
          disabled={saving || busy}
          onChange={(e) => {
            setReason(e.target.value);
            setSaved(false);
          }}
          placeholder="Khách quen, khuyến mãi tháng..."
          aria-invalid={Boolean(errors.reason)}
          className="h-11 sm:h-9"
        />
      </Field>
      {message && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" className="h-11 sm:h-8" disabled={saving || busy}>
          {saving ? "Đang áp dụng..." : "Áp dụng giảm giá"}
        </Button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
            <CircleCheck className="size-4" aria-hidden />
            Đã áp dụng
          </span>
        )}
      </div>
    </form>
  );
}

function PaymentForm({ invoice, busy, onDone, onQr }: { invoice: Invoice; busy: boolean; onDone: () => void; onQr: () => void }) {
  // Component được gắn `key` theo số còn phải thu, nên mặc định tự đặt lại sau giảm giá / mỗi lần thu.
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(String(invoice.due));
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  const wallet = useApiData<WalletInfo | null>(() =>
    invoice.contactId ? call(() => api.GET("/contacts/{contactId}/wallet", { params: { path: { contactId: invoice.contactId as string } } })) : Promise.resolve({ ok: true, data: null }),
  );

  const methods = paymentMethods.filter((m) => m.value !== "wallet" || invoice.contactId);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/invoices/{invoiceId}/payments", {
        params: { path: { invoiceId: invoice.id } },
        body: { method, amount: Math.max(0, Math.trunc(Number(amount) || 0)), reference: reference.trim() || null },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setReference("");
    onDone();
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-3 rounded-md border border-primary/30 p-3">
      <h3 className="text-sm font-semibold">Thu tiền</h3>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Hình thức</legend>
        <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} disabled={saving || busy} className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <Label
              key={m.value}
              htmlFor={`pay-${m.value}`}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal transition-colors hover:bg-muted/50",
                method === m.value && "border-primary bg-accent/50",
              )}
            >
              <RadioGroupItem id={`pay-${m.value}`} value={m.value} />
              <span className="flex flex-col">
                <span className="font-medium">{m.label}</span>
                {m.value === "wallet" && (
                  <span className="text-xs text-muted-foreground">
                    {wallet.data ? `Số dư ${formatMoney(wallet.data.balance)}` : wallet.problem ? "Không tải được số dư" : "Đang tải số dư..."}
                  </span>
                )}
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pay-amount" label="Số tiền" error={errors.amount}>
          <Input
            id="pay-amount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            max={invoice.due}
            value={amount}
            disabled={saving || busy}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id="pay-ref" label="Mã tham chiếu" hint="Số giao dịch, 4 số cuối thẻ..." error={errors.reference}>
          <Input id="pay-ref" value={reference} maxLength={100} disabled={saving || busy} onChange={(e) => setReference(e.target.value)} className="h-11 sm:h-9" />
        </Field>
      </div>
      {problem && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-destructive">
          {problemMessage(problem)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 sm:h-9" disabled={saving || busy || !(Number(amount) > 0)}>
          {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {saving ? "Đang ghi..." : `Thu ${formatMoney(Number(amount) || 0)}`}
        </Button>
        {method === "transfer" && (
          <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving || busy} onClick={onQr}>
            <QrCode aria-hidden />
            Mã QR chuyển khoản
          </Button>
        )}
      </div>
    </form>
  );
}

/** Mã VietQR cho số còn phải thu; BE sinh ảnh PNG từ tài khoản ngân hàng đã cài. */
function TransferQrDialog({ invoiceId, amount, onClose }: { invoiceId: string; amount: number; onClose: () => void }) {
  const { data, problem, reload } = useApiData<TransferQr>(() =>
    call(() => api.GET("/invoices/{invoiceId}/transfer-qr", { params: { path: { invoiceId }, query: { amount } } })),
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mã QR chuyển khoản</DialogTitle>
          <DialogDescription>Khách quét bằng ứng dụng ngân hàng; số tiền và nội dung đã điền sẵn.</DialogDescription>
        </DialogHeader>
        {problem ? (
          problem.code === "no_bank_account" ? (
            <Alert>
              <Wallet aria-hidden />
              <AlertDescription>
                Chưa cài tài khoản ngân hàng nhận chuyển khoản.{" "}
                <Link href="/settings#payments" className="font-medium text-primary underline-offset-4 hover:underline">
                  Cài ở Cài đặt → Thanh toán
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : (
            <ErrorState problem={problem} onRetry={reload} />
          )
        ) : !data ? (
          <div role="status" aria-label="Đang tạo mã QR" className="mx-auto size-64 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh base64 do BE sinh, không qua tối ưu ảnh */}
            <img src={`data:image/png;base64,${data.pngBase64}`} alt={`Mã QR chuyển ${formatMoney(data.amount)}`} className="size-64 rounded-md border bg-white" />
            <dl className="grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Ngân hàng</dt>
              <dd>{data.bankName}</dd>
              <dt className="text-muted-foreground">Số tài khoản</dt>
              <dd className="font-mono">{data.accountNo}</dd>
              <dt className="text-muted-foreground">Chủ tài khoản</dt>
              <dd>{data.accountName}</dd>
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="tabular font-medium">{formatMoney(data.amount)}</dd>
              <dt className="text-muted-foreground">Nội dung</dt>
              <dd className="font-mono break-all">{data.purpose}</dd>
            </dl>
            <CopyButton text={data.payload} label="Chép mã QR (chuỗi)" />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Xem trước phiếu thu (chữ) và gửi cho khách qua kênh chat đang kết nối. */
function ReceiptDialog({ invoiceId, hasContact, onClose, onSent }: { invoiceId: string; hasContact: boolean; onClose: () => void; onSent: () => void }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/invoices/{invoiceId}/receipt", { params: { path: { invoiceId } } })));
  const [sending, setSending] = useState(false);
  const [sendProblem, setSendProblem] = useState<ApiProblem | null>(null);
  const [outcome, setOutcome] = useState<"sent" | "no_channel" | null>(null);

  async function send() {
    setSending(true);
    setSendProblem(null);
    const result = await call(() => api.POST("/invoices/{invoiceId}/receipt/send", { params: { path: { invoiceId } } }));
    setSending(false);
    if (!result.ok) return setSendProblem(result.problem);
    setOutcome(result.data.sent ? "sent" : "no_channel");
    if (result.data.sent) onSent();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Phiếu thu</DialogTitle>
          <DialogDescription>Nội dung gửi cho khách qua Zalo (hoặc kênh chat khác đã kết nối).</DialogDescription>
        </DialogHeader>
        {problem ? (
          <ErrorState problem={problem} onRetry={reload} />
        ) : !data ? (
          <div role="status" aria-label="Đang tải phiếu thu" className="h-40 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        ) : (
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 font-sans text-sm whitespace-pre-wrap">{data.text}</pre>
        )}
        {sendProblem && (
          <p role="alert" className="text-sm text-destructive">
            {problemMessage(sendProblem)}
          </p>
        )}
        {outcome === "sent" && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-success">
            <CircleCheck className="size-4" aria-hidden />
            Đã gửi phiếu thu cho khách.
          </p>
        )}
        {outcome === "no_channel" && (
          <p role="status" className="text-sm text-warning">
            Khách chưa có kênh chat, không gửi được. Bạn có thể chép nội dung gửi tay.
          </p>
        )}
        <DialogFooter className="sm:justify-between">
          {data && <CopyButton text={data.text} label="Chép nội dung" />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={sending} onClick={onClose}>
              Đóng
            </Button>
            <Button type="button" className="h-11 sm:h-9" disabled={sending || !data || !hasContact} title={!hasContact ? "Khách lẻ không có kênh chat" : undefined} onClick={() => void send()}>
              {sending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
              {sending ? "Đang gửi..." : "Gửi phiếu thu"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({ invoiceId, number, onClose, onDone }: { invoiceId: string; number: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function submit() {
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.POST("/invoices/{invoiceId}/void", { params: { path: { invoiceId } }, body: { reason: reason.trim() } }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onDone();
    onClose();
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hủy hóa đơn {number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tiền đã thu sẽ được ghi hoàn lại, sản phẩm đã bán trả về kho, gói liệu trình chưa dùng bị thu hồi. Hóa đơn có gói đã dùng buổi thì không hủy được —
            hãy hoàn tiền một phần.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field id="void-reason" label="Lý do hủy" error={problem?.fieldErrors.reason}>
          <Textarea id="void-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.reason)} />
        </Field>
        {problem && !problem.fieldErrors.reason && (
          <p role="alert" className="text-sm text-destructive">
            {problemMessage(problem)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Giữ hóa đơn</AlertDialogCancel>
          <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => void submit()}>
            {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {busy ? "Đang hủy..." : "Hủy hóa đơn"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RefundDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const max = invoice.paidAmount - invoice.refundedAmount;
  const [amount, setAmount] = useState(String(max));
  const [method, setMethod] = useState<"cash" | "transfer" | "wallet">("cash");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/invoices/{invoiceId}/refund", {
        params: { path: { invoiceId: invoice.id } },
        body: { amount: Math.max(0, Math.trunc(Number(amount) || 0)), method, reason: reason.trim() },
      }),
    );
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoàn tiền {invoice.number}</DialogTitle>
          <DialogDescription>Đã thu {formatMoney(invoice.paidAmount)}; tối đa hoàn {formatMoney(max)}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="refund-amount" label="Số tiền hoàn" error={errors.amount}>
              <Input
                id="refund-amount"
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                step={1000}
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(errors.amount)}
                className="h-11 sm:h-9"
              />
            </Field>
            <Field id="refund-method" label="Hoàn bằng" error={errors.method}>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)} disabled={busy}>
                <SelectTrigger id="refund-method" className="h-11 w-full sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refundMethods
                    .filter((m) => m.value !== "wallet" || invoice.contactId)
                    .map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field id="refund-reason" label="Lý do" error={errors.reason}>
            <Textarea id="refund-reason" rows={2} maxLength={500} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
          </Field>
          {problem && !Object.keys(errors).length && (
            <p role="alert" className="text-sm text-destructive">
              {problemMessage(problem)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={onClose}>
              Đóng
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={busy || !reason.trim() || !(Number(amount) > 0)}>
              {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {busy ? "Đang hoàn..." : "Hoàn tiền"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
