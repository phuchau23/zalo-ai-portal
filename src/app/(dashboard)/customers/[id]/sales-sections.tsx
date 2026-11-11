"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, CircleAlert, Layers, LoaderCircle, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { Field } from "@/components/common/field";
import { InvoiceStatusBadge } from "@/components/common/status-pill";
import { IconTile } from "@/components/common/icon-tile";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type CustomerPackage } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { hasPermission, localToIso, parseOptionalInt } from "@/lib/crm";
import { formatDateTime, formatMoney } from "@/lib/format";
import { packageStatusActions, packageStatusOf, walletKindLabel } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ContactPicker, type ContactChoice } from "../../appointments/contact-picker";
import { InvoiceDetailDialog } from "../../sales/invoice-detail";

/** Gói liệu trình của khách: tiến độ, hạn, bảo lưu/kích hoạt/hủy, gia hạn, chuyển nhượng, lịch sử dùng buổi. */
export function CustomerPackagesSection({ contactId }: { contactId: string }) {
  const { me } = useSession();
  const canManage = hasPermission(me.currentTenant, "manage_catalog");
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/customer-packages", { params: { query: { contactId } } })));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [adjusting, setAdjusting] = useState<CustomerPackage | null>(null);
  const [transferring, setTransferring] = useState<CustomerPackage | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function act(id: string, request: () => Promise<ApiResult<unknown>>) {
    setActionProblem(null);
    setBusyId(id);
    const result = await request();
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  const rows = [...(data ?? [])].sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || b.createdAt.localeCompare(a.createdAt));

  return (
    <section aria-labelledby="packages" className="surface flex flex-col gap-4 rounded-2xl p-5">
      <CardTitle id="packages" icon={Layers}>
        Gói liệu trình
      </CardTitle>
      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}
      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải gói" className="skeleton h-24 rounded-xl" />
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          <Layers className="size-4 shrink-0" aria-hidden />
          Khách chưa mua gói nào. Bán gói qua hóa đơn ở trang Bán hàng.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => {
            const st = packageStatusOf(p.status);
            const busy = busyId === p.id;
            const pct = p.totalSessions > 0 ? Math.min(100, Math.round((p.usedSessions / p.totalSessions) * 100)) : 0;
            const open = expanded === p.id;
            return (
              <li key={p.id} className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <span className="tabular ml-auto text-sm text-muted-foreground">
                    còn <span className="text-lg font-bold text-foreground">{p.remaining}</span>/{p.totalSessions} buổi
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.usedSessions} aria-valuemin={0} aria-valuemax={p.totalSessions} aria-label="Đã dùng">
                  <div className={cn("h-full rounded-full transition-[width] duration-700", p.status === "active" ? "bg-active-gradient" : "bg-muted-foreground/40")} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.expiresAt ? `Hạn ${formatDateTime(p.expiresAt)}` : "Không giới hạn hạn dùng"} · Mua {formatMoney(p.pricePaid)} · {formatDateTime(p.createdAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {packageStatusActions(p.status).map((a) => (
                    <Button
                      key={a.status}
                      size="sm"
                      variant={a.status === "cancelled" ? "ghost" : "outline"}
                      className={cn("h-11 sm:h-8", a.status === "cancelled" && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                      disabled={busy}
                      onClick={() => {
                        if (a.status === "cancelled" && !window.confirm(`Hủy gói "${p.name}"? Buổi còn lại sẽ không dùng được nữa.`)) return;
                        void act(p.id, () => call(() => api.PATCH("/customer-packages/{packageId}/status", { params: { path: { packageId: p.id } }, body: { status: a.status } })));
                      }}
                    >
                      {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                      {a.label}
                    </Button>
                  ))}
                  {canManage && (p.status === "active" || p.status === "paused" || p.status === "expired" || p.status === "exhausted") && (
                    <Button size="sm" variant="outline" className="h-11 sm:h-8" disabled={busy} onClick={() => setAdjusting(p)}>
                      Gia hạn / sửa
                    </Button>
                  )}
                  {canManage && (p.status === "active" || p.status === "paused") && (
                    <Button size="sm" variant="outline" className="h-11 sm:h-8" disabled={busy} onClick={() => setTransferring(p)}>
                      Chuyển nhượng
                    </Button>
                  )}
                  {p.usedSessions > 0 && (
                    <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setExpanded(open ? null : p.id)} aria-expanded={open}>
                      {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
                      Lịch sử dùng buổi
                    </Button>
                  )}
                </div>
                {open && <Redemptions packageId={p.id} />}
              </li>
            );
          })}
        </ul>
      )}

      {adjusting && (
        <AdjustPackageDialog
          pkg={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            reload();
          }}
        />
      )}
      {transferring && (
        <TransferPackageDialog
          pkg={transferring}
          onClose={() => setTransferring(null)}
          onSaved={() => {
            setTransferring(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function Redemptions({ packageId }: { packageId: string }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/customer-packages/{packageId}/redemptions", { params: { path: { packageId } } })));
  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: true } } })));
  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (!data) return <div role="status" aria-label="Đang tải" className="skeleton h-10 rounded-lg" />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Chưa dùng buổi nào.</p>;
  return (
    <ol className="flex flex-col divide-y divide-border/70 rounded-lg border border-border/70 bg-muted/30 text-sm">
      {[...data]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5">
            <span className="w-8 text-muted-foreground">#{data.length - i}</span>
            <span className="tabular">{formatDateTime(r.at)}</span>
            {r.staffMemberId && <span className="text-muted-foreground">{staff.data?.find((s) => s.id === r.staffMemberId)?.displayName ?? ""}</span>}
            {r.appointmentId && <span className="text-xs text-muted-foreground">từ lịch hẹn</span>}
          </li>
        ))}
    </ol>
  );
}

function AdjustPackageDialog({ pkg, onClose, onSaved }: { pkg: CustomerPackage; onClose: () => void; onSaved: () => void }) {
  const [totalSessions, setTotalSessions] = useState(String(pkg.totalSessions));
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!pkg.expiresAt) return "";
    const d = new Date(pkg.expiresAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.PATCH("/customer-packages/{packageId}", { params: { path: { packageId: pkg.id } }, body: { totalSessions: parseOptionalInt(totalSessions), expiresAt: localToIso(expiresAt) } }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gia hạn / sửa gói</DialogTitle>
          <DialogDescription>
            {pkg.name} · đã dùng {pkg.usedSessions}/{pkg.totalSessions} buổi.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <Field id="pkg-total" label="Tổng số buổi" hint={`Không nhỏ hơn số đã dùng (${pkg.usedSessions}).`} error={errors.totalSessions}>
            <Input
              id="pkg-total"
              type="number"
              inputMode="numeric"
              min={pkg.usedSessions}
              value={totalSessions}
              disabled={saving}
              onChange={(e) => setTotalSessions(e.target.value)}
              aria-invalid={Boolean(errors.totalSessions)}
              className="h-11 sm:h-9"
            />
          </Field>
          <Field id="pkg-expires" label="Hạn dùng" hint="Trống = không giới hạn." error={errors.expiresAt}>
            <Input id="pkg-expires" type="datetime-local" value={expiresAt} disabled={saving} onChange={(e) => setExpiresAt(e.target.value)} aria-invalid={Boolean(errors.expiresAt)} className="h-11 sm:h-9" />
          </Field>
          {problem && !Object.keys(errors).length && (
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
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferPackageDialog({ pkg, onClose, onSaved }: { pkg: CustomerPackage; onClose: () => void; onSaved: () => void }) {
  const [contact, setContact] = useState<ContactChoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const target = contact?.kind === "existing" ? contact : null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.POST("/customer-packages/{packageId}/transfer", { params: { path: { packageId: pkg.id } }, body: { toContactId: target.id } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển nhượng gói</DialogTitle>
          <DialogDescription>
            {pkg.name} (còn {pkg.remaining} buổi) sẽ chuyển sang khách khác; gói của khách này đánh dấu &quot;Đã chuyển nhượng&quot;.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <ContactPicker idPrefix="pkg-transfer" value={contact} onChange={setContact} allowNew={false} errors={problem?.fieldErrors ?? {}} disabled={saving} />
          {target?.id === pkg.contactId && (
            <p className="text-sm text-destructive">Đây là chính khách đang giữ gói.</p>
          )}
          {problem && !Object.keys(problem.fieldErrors).length && (
            <p role="alert" className="text-sm text-destructive">
              {problemMessage(problem)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !target || target.id === pkg.contactId}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang chuyển..." : "Chuyển nhượng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Thẻ trả trước: số dư, giao dịch, nạp tiền (ai cũng được), điều chỉnh (cần quyền hoàn tiền). */
export function CustomerWalletSection({ contactId }: { contactId: string }) {
  const { me } = useSession();
  const canAdjust = hasPermission(me.currentTenant, "refund");
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/contacts/{contactId}/wallet", { params: { path: { contactId } } })));
  const [dialog, setDialog] = useState<"topup" | "adjust" | null>(null);
  const [showAll, setShowAll] = useState(false);

  const tx = data ? [...data.transactions].sort((a, b) => b.at.localeCompare(a.at)) : [];
  const shown = showAll ? tx : tx.slice(0, 5);

  return (
    <section aria-labelledby="wallet" className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle id="wallet" icon={Wallet}>
          Thẻ trả trước
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-11 rounded-full sm:h-8" onClick={() => setDialog("topup")}>
            Nạp tiền
          </Button>
          {canAdjust && (
            <Button size="sm" variant="ghost" className="h-11 rounded-full sm:h-8" onClick={() => setDialog("adjust")}>
              Điều chỉnh
            </Button>
          )}
        </div>
      </div>
      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải thẻ" className="skeleton h-20 rounded-xl" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative isolate overflow-hidden rounded-xl bg-active-gradient p-4 text-white shadow-glow">
            <p className="text-xs font-medium text-white/80">Số dư hiện có</p>
            <p className="tabular text-2xl font-bold tracking-tight">{formatMoney(data.balance)}</p>
          </div>
          {tx.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch. Nạp tiền để khách thanh toán nhanh bằng thẻ ở lần sau.</p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border/70 text-sm">
                {shown.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                    <span className="font-medium">{walletKindLabel(t.kind)}</span>
                    {t.note && <span className="truncate text-xs text-muted-foreground">{t.note}</span>}
                    <span className="text-xs text-muted-foreground">{formatDateTime(t.at)}</span>
                    <span className={cn("tabular ml-auto font-medium", t.amount < 0 ? "text-destructive" : "text-success")}>
                      {t.amount > 0 ? "+" : "−"}
                      {formatMoney(Math.abs(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
              {tx.length > 5 && (
                <Button variant="link" size="sm" className="h-9 w-fit px-0" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Thu gọn" : `Xem tất cả (${tx.length})`}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {dialog && (
        <WalletDialog
          kind={dialog}
          contactId={contactId}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function WalletDialog({ kind, contactId, onClose, onSaved }: { kind: "topup" | "adjust"; contactId: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [bonus, setBonus] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result =
      kind === "topup"
        ? await call(() =>
            api.POST("/contacts/{contactId}/wallet/topup", {
              params: { path: { contactId } },
              body: { amount: Math.max(0, Math.trunc(Number(amount) || 0)), bonus: Math.max(0, Math.trunc(Number(bonus) || 0)), note: note.trim() || null },
            }),
          )
        : await call(() => api.POST("/contacts/{contactId}/wallet/adjust", { params: { path: { contactId } }, body: { delta: Math.trunc(Number(amount) || 0), reason: note.trim() } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  const topup = kind === "topup";
  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{topup ? "Nạp tiền vào thẻ" : "Điều chỉnh số dư"}</DialogTitle>
          <DialogDescription>
            {topup ? "Khách đưa tiền để dùng dần; có thể tặng thêm (khuyến mãi nạp)." : "Cộng (số dương) hoặc trừ (số âm) số dư, ghi rõ lý do. Mọi lần đều được ghi lại."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <div className={cn("grid gap-3", topup && "sm:grid-cols-2")}>
            <Field id="wl-amount" label={topup ? "Số tiền nạp" : "Thay đổi (+/−)"} error={errors.amount ?? errors.delta}>
              <Input
                id="wl-amount"
                type="number"
                inputMode="numeric"
                min={topup ? 0 : undefined}
                step={1000}
                value={amount}
                disabled={saving}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(errors.amount ?? errors.delta)}
                className="h-11 sm:h-9"
              />
            </Field>
            {topup && (
              <Field id="wl-bonus" label="Tặng thêm" error={errors.bonus}>
                <Input id="wl-bonus" type="number" inputMode="numeric" min={0} step={1000} value={bonus} disabled={saving} onChange={(e) => setBonus(e.target.value)} aria-invalid={Boolean(errors.bonus)} className="h-11 sm:h-9" />
              </Field>
            )}
          </div>
          <Field id="wl-note" label={topup ? "Ghi chú" : "Lý do"} error={errors.note ?? errors.reason}>
            <Textarea id="wl-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(errors.note ?? errors.reason)} />
          </Field>
          {problem && !Object.keys(errors).length && (
            <p role="alert" className="text-sm text-destructive">
              {problemMessage(problem)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !(Number(amount) !== 0) || (!topup && !note.trim())}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : topup ? "Nạp tiền" : "Điều chỉnh"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tiêu đề thẻ (gói, thẻ trả trước, hóa đơn) trên trang hồ sơ khách: ô biểu tượng + chữ. */
function CardTitle({ id, icon, children }: { id: string; icon: LucideIcon; children: string }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} size="sm" />
      <h2 id={id} className="text-base font-semibold tracking-tight">
        {children}
      </h2>
    </div>
  );
}

/** 10 hóa đơn gần nhất của khách; bấm mở chi tiết. */
export function CustomerInvoicesSection({ contactId }: { contactId: string }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/invoices", { params: { query: { contactId } } })));
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    reload();
  }, [contactId, reload]);

  const rows = [...(data ?? [])].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 10);

  return (
    <section aria-labelledby="invoices" className="surface flex flex-col gap-4 rounded-2xl p-5">
      <CardTitle id="invoices" icon={Receipt}>
        Hóa đơn
      </CardTitle>
      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải hóa đơn" className="skeleton h-16 rounded-xl" />
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
          <Receipt className="size-4 shrink-0" aria-hidden />
          Khách chưa có hóa đơn.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => {
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(r.id)}
                  className="group flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-xl border border-border/70 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary" aria-hidden>
                    <Receipt className="size-4" />
                  </span>
                  <span className="font-mono font-medium">{r.number}</span>
                  <InvoiceStatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.issuedAt)}</span>
                  <span className="tabular ml-auto font-semibold">{formatMoney(r.total)}</span>
                  {r.due > 0 && r.status !== "void" && <span className="tabular text-xs text-warning">nợ {formatMoney(r.due)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {detailId && <InvoiceDetailDialog invoiceId={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
    </section>
  );
}
