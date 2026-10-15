"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search, UserRound, UserRoundPlus, X } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { call } from "@/lib/api/call";
import { api, type ContactItem } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

export type ContactChoice =
  | { kind: "existing"; id: string; name: string; phone: string | null }
  | { kind: "new"; name: string; phone: string; salutation: string | null };

/** Cách gọi khách (BE: CustomerSalutation). Không có "anh/chị": chưa biết giới tính thì bot gọi "mình". */
const salutations = [
  { value: "anh", label: "Anh" },
  { value: "chị", label: "Chị" },
  { value: "cô", label: "Cô" },
  { value: "chú", label: "Chú" },
  { value: "bác", label: "Bác" },
] as const;

const NONE = "__none__";

/**
 * Chọn khách cho lịch hẹn / hàng chờ: gõ tên hoặc số điện thoại để tìm trong danh sách khách, hoặc nhập khách mới (nếu `allowNew`).
 * `initialContactId` (từ ?contactId=) → tự tải tên khách để hiện sẵn.
 */
export function ContactPicker({
  idPrefix,
  value,
  onChange,
  allowNew = true,
  initialContactId,
  errors = {},
  disabled = false,
}: {
  idPrefix: string;
  value: ContactChoice | null;
  onChange: (value: ContactChoice | null) => void;
  allowNew?: boolean;
  initialContactId?: string | null;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  // Kết quả tìm gắn với từ khóa đã tìm; từ khóa đổi mà chưa có kết quả = đang tìm.
  const [results, setResults] = useState<{ q: string; items: ContactItem[] } | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [mode, setMode] = useState<"search" | "new">("search");
  const [loadingInitial, setLoadingInitial] = useState(Boolean(initialContactId));

  // Khách được chọn sẵn (từ hồ sơ khách): tải tên để hiện.
  useEffect(() => {
    if (!initialContactId) return;
    let cancelled = false;
    void (async () => {
      const result = await call(() => api.GET("/contacts/{contactId}", { params: { path: { contactId: initialContactId } } }));
      if (cancelled) return;
      setLoadingInitial(false);
      if (result.ok) onChange({ kind: "existing", id: result.data.contact.id, name: result.data.contact.name, phone: result.data.contact.phone });
      else setProblem(result.problem);
    })();
    return () => {
      cancelled = true;
    };
    // Chỉ chạy một lần khi mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContactId]);

  // Tìm khách sau khi ngừng gõ 300ms.
  const q = query.trim();
  const searchActive = mode === "search" && q.length >= 2;
  useEffect(() => {
    if (!searchActive) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await call(() => api.GET("/contacts", { params: { query: { q, includeTest: true } } }));
      if (cancelled) return;
      if (!result.ok) return setProblem(result.problem);
      setProblem(null);
      setResults({ q, items: result.data.items.slice(0, 8) });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, searchActive]);

  const current = searchActive && results?.q === q ? results.items : null;
  const searching = searchActive && !current && !problem;

  const p = idPrefix;
  const contactError = errors.contactId ?? errors.newContact;

  if (loadingInitial) {
    return (
      <div role="status" className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Đang tải khách...
      </div>
    );
  }

  if (value?.kind === "existing") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Khách</span>
        <div className="flex min-h-11 items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{value.name}</span>
            {value.phone && <span className="text-muted-foreground"> · {value.phone}</span>}
          </span>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-9 sm:h-7" onClick={() => onChange(null)}>
              <X aria-hidden />
              Đổi
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "new" && allowNew) {
    const v: Extract<ContactChoice, { kind: "new" }> = value?.kind === "new" ? value : { kind: "new", name: "", phone: "", salutation: null };
    const set = (patch: Partial<typeof v>) => onChange({ ...v, ...patch });
    return (
      <div className="flex flex-col gap-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Khách mới</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 sm:h-7"
            disabled={disabled}
            onClick={() => {
              setMode("search");
              onChange(null);
            }}
          >
            Tìm khách có sẵn
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={`${p}-new-name`} label="Tên khách" error={errors["newContact.name"] ?? errors["newContact.Name"]}>
            <Input
              id={`${p}-new-name`}
              required
              maxLength={200}
              value={v.name}
              disabled={disabled}
              onChange={(e) => set({ name: e.target.value })}
              aria-invalid={Boolean(errors["newContact.name"])}
              className="h-11 sm:h-9"
            />
          </Field>
          <Field id={`${p}-new-phone`} label="Số điện thoại" hint="Không bắt buộc; có số thì nhắc lịch được." error={errors["newContact.phone"] ?? errors["newContact.Phone"]}>
            <Input
              id={`${p}-new-phone`}
              type="tel"
              inputMode="tel"
              maxLength={20}
              value={v.phone}
              disabled={disabled}
              onChange={(e) => set({ phone: e.target.value })}
              aria-invalid={Boolean(errors["newContact.phone"])}
              aria-describedby={describedBy(`${p}-new-phone`, errors["newContact.phone"], true)}
              className="h-11 sm:h-9"
            />
          </Field>
          <Field id={`${p}-new-salutation`} label="Cách gọi" error={errors["newContact.salutation"]}>
            <Select value={v.salutation ?? NONE} onValueChange={(s) => set({ salutation: s === NONE ? null : s })} disabled={disabled}>
              <SelectTrigger id={`${p}-new-salutation`} className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Chưa rõ (gọi &quot;mình&quot;)</SelectItem>
                {salutations.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Field id={`${p}-search`} label="Khách" error={contactError}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id={`${p}-search`}
            type="search"
            placeholder="Gõ tên hoặc số điện thoại..."
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            aria-invalid={Boolean(contactError)}
            autoComplete="off"
            className="h-11 pl-9 sm:h-9"
          />
        </div>
      </Field>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problemMessage(problem)}
        </p>
      )}
      {searching ? (
        <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Đang tìm...
        </p>
      ) : current ? (
        current.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không thấy khách nào khớp.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto rounded-md border" aria-label="Kết quả tìm khách">
            {current.map((c) => (
              <li key={c.id} className="border-b last:border-0">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange({ kind: "existing", id: c.id, name: c.name, phone: c.phone });
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                  )}
                >
                  <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  {c.phone && <span className="shrink-0 text-xs text-muted-foreground">{c.phone}</span>}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {allowNew && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 w-fit sm:h-8"
          disabled={disabled}
          onClick={() => {
            setMode("new");
            onChange({ kind: "new", name: query.trim(), phone: "", salutation: null });
          }}
        >
          <UserRoundPlus aria-hidden />
          Khách mới
        </Button>
      )}
    </div>
  );
}
