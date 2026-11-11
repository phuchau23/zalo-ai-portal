"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, Landmark, LoaderCircle, Lock, MapPin, Plus, QrCode, Star, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type BankAccount } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { branchName } from "@/lib/crm";
import { bankNameOf, banks, isBankBin } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { AddPanel, MotionItem, MotionList } from "./settings-ui";

const NONE = "__none__";
const OTHER = "__other__";

/** Cài đặt → Thanh toán: tài khoản ngân hàng nhận chuyển khoản (sinh mã VietQR trên hóa đơn). Chỉ chủ doanh nghiệp được sửa. */
export function PaymentSection() {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/tenant/bank-accounts")));
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const [removing, setRemoving] = useState<BankAccount | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div id="payments" className="flex flex-col gap-5">
      <SectionHeader
        icon={Landmark}
        title="Thanh toán"
        description="Tài khoản ngân hàng nhận chuyển khoản. Khi thu tiền, hóa đơn sinh mã QR có sẵn số tiền và nội dung để khách quét."
        actions={
          isOwner &&
          !adding && (
            <Button className="h-11 sm:h-9" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              Thêm tài khoản
            </Button>
          )
        }
      />

      {!isOwner && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Chỉ chủ doanh nghiệp thêm hoặc xóa tài khoản ngân hàng.</AlertDescription>
        </Alert>
      )}

      {isOwner && adding && (
        <AddAccountForm
          branches={branches.data ?? []}
          onCancel={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            reload();
          }}
        />
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingRows rows={2} columns={3} label="Đang tải tài khoản" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Landmark} title="Chưa có tài khoản ngân hàng" description="Thêm tài khoản để nút “Mã QR chuyển khoản” trên hóa đơn hoạt động." />
      ) : (
        <MotionList label="Tài khoản ngân hàng" className="grid gap-3 lg:grid-cols-2">
          {data.map((a) => (
            <MotionItem key={a.id} className={cn("relative flex flex-col gap-4 overflow-hidden p-4", a.isDefault && "border-primary/30")}>
              {/* Dải màu mảnh trên đầu thẻ: tài khoản mặc định nổi bật hơn. */}
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", a.isDefault ? "bg-active-gradient" : "bg-muted")} />
              <div className="flex items-start gap-3">
                <IconTile icon={Landmark} variant={a.isDefault ? "solid" : "soft"} size="md" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {a.bankName}
                    {a.isDefault && (
                      <Badge variant="success" className="gap-1">
                        <Star aria-hidden />
                        Mặc định
                      </Badge>
                    )}
                  </span>
                  <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{a.accountName}</span>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-11 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:size-8"
                    aria-label={`Xóa tài khoản ${a.bankName} ${a.accountNoMasked}`}
                    onClick={() => setRemoving(a)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <span className="tabular font-mono text-lg font-semibold tracking-[0.12em]">{a.accountNoMasked}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {branchName(branches.data, a.branchId)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <QrCode className="size-3.5" aria-hidden />
                    VietQR
                  </span>
                </span>
              </div>
            </MotionItem>
          ))}
        </MotionList>
      )}

      {removing && (
        <RemoveDialog
          account={removing}
          onClose={() => setRemoving(null)}
          onDone={() => {
            setRemoving(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function AddAccountForm({ branches, onCancel, onAdded }: { branches: { id: string; name: string }[]; onCancel: () => void; onAdded: () => void }) {
  const [branchId, setBranchId] = useState(NONE);
  const [bankChoice, setBankChoice] = useState("");
  const [manualBin, setManualBin] = useState("");
  const [manualName, setManualName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  const bankBin = bankChoice === OTHER ? manualBin.trim() : bankChoice;
  const bankName = bankChoice === OTHER ? manualName.trim() : (bankNameOf(bankChoice) ?? "");
  const valid = isBankBin(bankBin) && bankName.length > 0 && accountNo.trim().length > 0 && accountName.trim().length > 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/tenant/bank-accounts", {
        body: { branchId: branchId === NONE ? null : branchId, bankBin, bankName, accountNo: accountNo.replace(/\s/g, ""), accountName: accountName.trim().toUpperCase(), isDefault },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onAdded();
  }

  return (
    <AddPanel icon={Landmark} title="Thêm tài khoản ngân hàng" description="Số tài khoản chỉ hiện một phần sau khi lưu.">
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      {problem && !Object.keys(errors).length && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bank-choice" label="Ngân hàng" error={errors.bankBin}>
          <Select value={bankChoice} onValueChange={setBankChoice} disabled={saving}>
            <SelectTrigger id="bank-choice" className="h-11 w-full bg-card sm:h-9" aria-invalid={Boolean(errors.bankBin)}>
              <SelectValue placeholder="Chọn ngân hàng" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.bin} value={b.bin}>
                  {b.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER}>Khác (nhập mã BIN)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {branches.length > 1 && (
          <Field id="bank-branch" label="Chi nhánh" hint="Trống = dùng cho mọi chi nhánh." error={errors.branchId}>
            <Select value={branchId} onValueChange={setBranchId} disabled={saving}>
              <SelectTrigger id="bank-branch" className="h-11 w-full bg-card sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Mọi chi nhánh</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {bankChoice === OTHER && (
          <>
            <Field id="bank-bin" label="Mã BIN" hint="6 chữ số theo chuẩn VietQR/NAPAS." error={errors.bankBin}>
              <Input id="bank-bin" inputMode="numeric" maxLength={6} value={manualBin} disabled={saving} onChange={(e) => setManualBin(e.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(errors.bankBin)} className="h-11 bg-card font-mono sm:h-9" />
            </Field>
            <Field id="bank-name" label="Tên ngân hàng" error={errors.bankName}>
              <Input id="bank-name" maxLength={100} value={manualName} disabled={saving} onChange={(e) => setManualName(e.target.value)} aria-invalid={Boolean(errors.bankName)} className="h-11 bg-card sm:h-9" />
            </Field>
          </>
        )}
        <Field id="bank-no" label="Số tài khoản" error={errors.accountNo}>
          <Input id="bank-no" inputMode="numeric" maxLength={30} value={accountNo} disabled={saving} onChange={(e) => setAccountNo(e.target.value)} autoComplete="off" aria-invalid={Boolean(errors.accountNo)} className="h-11 bg-card font-mono sm:h-9" />
        </Field>
        <Field id="bank-owner" label="Tên chủ tài khoản" hint="Không dấu, in hoa như trên thẻ." error={errors.accountName}>
          <Input id="bank-owner" maxLength={100} value={accountName} disabled={saving} onChange={(e) => setAccountName(e.target.value)} aria-invalid={Boolean(errors.accountName)} className="h-11 bg-card uppercase sm:h-9" />
        </Field>
      </div>
      <Label htmlFor="bank-default" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
        <Checkbox id="bank-default" checked={isDefault} disabled={saving} onCheckedChange={(v) => setIsDefault(v === true)} />
        Dùng làm tài khoản mặc định
      </Label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 sm:h-9" disabled={saving || !valid}>
          {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {saving ? "Đang lưu..." : "Lưu tài khoản"}
        </Button>
        <Button type="button" variant="ghost" className="h-11 sm:h-9" disabled={saving} onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
    </AddPanel>
  );
}

function RemoveDialog({ account, onClose, onDone }: { account: BankAccount; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function remove() {
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.DELETE("/tenant/bank-accounts/{accountId}", { params: { path: { accountId: account.id } } }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onDone();
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa tài khoản {account.bankName} {account.accountNoMasked}?</AlertDialogTitle>
          <AlertDialogDescription>Mã QR trên hóa đơn sẽ không dùng tài khoản này nữa. Hóa đơn đã thu không bị ảnh hưởng.</AlertDialogDescription>
        </AlertDialogHeader>
        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {problemMessage(problem)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Giữ lại</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Trash2 aria-hidden />}
            {busy ? "Đang xóa..." : "Xóa"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
