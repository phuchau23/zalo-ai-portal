"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { formatDateTime, formatMoney } from "@/lib/format";
import { movementKindOf, signedQuantity } from "@/lib/inventory";
import { formatQty } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import type { InventoryContext } from "./inventory-page";

const ALL = "__all__";

/** Lịch sử xuất nhập của chi nhánh (200 dòng gần nhất), lọc theo sản phẩm. */
export function MovementsSection({ ctx }: { ctx: InventoryContext }) {
  const { branchId, products, version } = ctx;
  const [itemFilter, setItemFilter] = useState(ALL);
  const { data, problem, reload } = useApiData(() =>
    call(() => api.GET("/inventory/movements", { params: { query: { branchId, catalogItemId: itemFilter === ALL ? undefined : itemFilter, limit: 200 } } })),
  );
  useEffect(() => {
    reload();
  }, [branchId, itemFilter, version, reload]);

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "(sản phẩm)";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:w-72">
        <Label htmlFor="mv-item">Sản phẩm</Label>
        <Select value={itemFilter} onValueChange={setItemFilter}>
          <SelectTrigger id="mv-item" className="h-11 w-full sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi sản phẩm</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <LoadingRows rows={6} columns={5} label="Đang tải lịch sử kho" />
      ) : data.length === 0 ? (
        <EmptyState icon={History} title="Chưa có giao dịch kho" description="Mỗi lần nhập, bán, chuyển, kiểm kê hay tiêu hao theo dịch vụ sẽ ghi một dòng ở đây." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lúc</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead className="text-right">Tồn sau</TableHead>
                <TableHead className="hidden text-right md:table-cell">Giá vốn</TableHead>
                <TableHead className="hidden lg:table-cell">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => {
                const kind = movementKindOf(m.kind);
                const q = signedQuantity(m.kind, m.quantity);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">{formatDateTime(m.at)}</TableCell>
                    <TableCell>
                      <Badge variant={kind.variant}>{kind.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-medium">{nameOf(m.catalogItemId)}</TableCell>
                    <TableCell className={cn("tabular text-right font-medium", q > 0 ? "text-success" : q < 0 ? "text-destructive" : "")}>
                      {q > 0 ? "+" : ""}
                      {formatQty(q)}
                    </TableCell>
                    <TableCell className="tabular text-right">{formatQty(m.balanceAfter)}</TableCell>
                    <TableCell className="tabular hidden text-right text-muted-foreground md:table-cell">{m.unitCost === null ? "—" : formatMoney(m.unitCost)}</TableCell>
                    <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground lg:table-cell">{m.note ?? (m.refType ? `${m.refType}` : "")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
