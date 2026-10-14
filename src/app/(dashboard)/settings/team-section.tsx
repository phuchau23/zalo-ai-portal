"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, KeyRound, Trash2, UserPlus, Users } from "lucide-react";
import { SectionHeader } from "@/components/common/page-header";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { useApiData } from "@/lib/use-api-data";

type Member = Schemas["TeamMemberResponse"];

const roles = [
  { value: "staff", label: "Nhân viên", hint: "Trả lời khách ở Hộp thư, chăm sóc khách. Không xem chi phí, không xuất/xóa dữ liệu, không đổi cài đặt." },
  { value: "owner", label: "Chủ doanh nghiệp", hint: "Toàn quyền như bạn, kể cả quản lý nhân viên." },
] as const;

const roleLabel = (role: string) => (role === "owner" ? "Chủ doanh nghiệp" : "Nhân viên");

/** Mật khẩu tạm vừa cấp: hiện một lần để chủ DN gửi cho nhân viên qua kênh riêng. */
type Issued = { email: string; password: string; title: string };

/** Cài đặt → Nhân viên — chỉ chủ doanh nghiệp thấy (BE cũng chỉ cho chủ gọi). */
export function TeamSection() {
  const { me } = useSession();
  return me.currentTenant?.role === "owner" ? <TeamManager /> : null;
}

/** BE chặn: luôn còn ít nhất một chủ, không tự xóa mình, chỉ cấp lại mật khẩu cho tài khoản riêng của DN. */
function TeamManager() {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/tenant/team")));
  const [issued, setIssued] = useState<Issued | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busy, setBusy] = useState(false);

  async function changeRole(member: Member, role: string) {
    setActionProblem(null);
    const result = await call(() => api.PATCH("/tenant/team/{userId}", { params: { path: { userId: member.userId } }, body: { role } }));
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  async function resetPassword(member: Member) {
    setActionProblem(null);
    setBusy(true);
    const result = await call(() => api.POST("/tenant/team/{userId}/reset-password", { params: { path: { userId: member.userId } } }));
    setBusy(false);
    if (!result.ok) return setActionProblem(result.problem);
    setIssued({ email: member.email, password: result.data.temporaryPassword, title: `Mật khẩu mới của ${member.name}` });
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setActionProblem(null);
    const result = await call(() => api.DELETE("/tenant/team/{userId}", { params: { path: { userId: removing.userId } } }));
    setBusy(false);
    setRemoving(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  return (
    <div id="team" className="mt-10 flex scroll-mt-6 flex-col gap-4">
      <SectionHeader
        title="Nhân viên"
        description="Thêm tài khoản cho nhân viên trực Hộp thư. Mỗi người một tài khoản riêng để biết ai đã trả lời khách."
      />

      <AddMemberForm
        onAdded={(email, password) => {
          reload();
          if (password) setIssued({ email, password, title: "Đã thêm nhân viên" });
        }}
      />

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingRows rows={2} columns={3} label="Đang tải danh sách nhân viên" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Users} title="Chưa có ai" />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {data.map((m) => (
            <li key={m.userId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {m.name}
                  {m.isYou && <Badge variant="secondary">Bạn</Badge>}
                </span>
                <span className="text-sm break-all text-muted-foreground">{m.email}</span>
              </div>
              {m.isYou ? (
                <Badge variant="outline" className="self-start sm:self-center">
                  {roleLabel(m.role)}
                </Badge>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={m.role} onValueChange={(v) => void changeRole(m, v)}>
                    <SelectTrigger aria-label={`Vai trò của ${m.name}`} className="h-11 w-44 sm:h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-11 sm:h-8" disabled={busy} onClick={() => void resetPassword(m)}>
                    <KeyRound aria-hidden />
                    Cấp lại mật khẩu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8"
                    onClick={() => setRemoving(m)}
                  >
                    <Trash2 aria-hidden />
                    Xóa
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{issued?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Gửi email và mật khẩu tạm này cho nhân viên qua kênh riêng (Zalo cá nhân, gọi điện). Mật khẩu chỉ hiện MỘT lần. Nhân viên nên đổi
              mật khẩu ở trang Tài khoản sau khi đăng nhập.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {issued && (
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{issued.email}</dd>
              <dt className="text-muted-foreground">Mật khẩu tạm</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <code className="font-mono font-semibold">{issued.password}</code>
                <CopyButton text={issued.password} />
              </dd>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogAction>Đã lưu, đóng lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !busy && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {removing?.name} khỏi doanh nghiệp?</AlertDialogTitle>
            <AlertDialogDescription>
              Người này mất quyền truy cập ngay. Các hội thoại và ghi chú họ đã làm vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Không</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              <Trash2 aria-hidden />
              Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: (email: string, temporaryPassword: string | null) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    setNotice(null);
    const result = await call(() => api.POST("/tenant/team", { body: { email: email.trim(), name: name.trim(), role } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    if (!result.data.temporaryPassword) setNotice(`${result.data.member.email} đã có tài khoản nên dùng mật khẩu hiện có để đăng nhập.`);
    onAdded(result.data.member.email, result.data.temporaryPassword);
    setEmail("");
    setName("");
  }

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-email">Email đăng nhập</Label>
          <Input
            id="member-email"
            type="email"
            autoComplete="off"
            required
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            className="h-11 sm:h-9"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-name">Tên</Label>
          <Input
            id="member-name"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            className="h-11 sm:h-9"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-role">Vai trò</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="member-role" className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={saving || !email.trim() || !name.trim()} className="h-11 sm:h-9">
          <UserPlus aria-hidden />
          {saving ? "Đang thêm..." : "Thêm"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{roles.find((r) => r.value === role)?.hint}</p>
      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {Object.values(problem.fieldErrors)[0] ?? problemMessage(problem)}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}
    </form>
  );
}
