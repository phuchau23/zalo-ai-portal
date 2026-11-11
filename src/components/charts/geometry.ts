/**
 * Hình học dùng chung cho biểu đồ SVG tự viết (không thêm thư viện biểu đồ — chủ dự án chốt 2026-11-06).
 * Đường cong "monotone" (Fritsch–Carlson): mượt nhưng không vọt lên/xuống quá điểm dữ liệu
 * → doanh thu 0 không bị vẽ thành số âm như cách nối Catmull-Rom.
 */

export type Point = { x: number; y: number };

/** Đường cong đơn điệu qua các điểm (x tăng dần). 1 điểm → chấm; 2 điểm → đoạn thẳng. */
export function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  if (n === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  tangent[n - 1] = slope[n - 2];

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const third = dx[i] / 3;
    d += `C${p0.x + third},${p0.y + tangent[i] * third} ${p1.x - third},${p1.y - tangent[i + 1] * third} ${p1.x},${p1.y}`;
  }
  return d;
}

/** Vùng tô dưới đường cong, khép về đáy `baseY`. */
export function areaPath(points: Point[], baseY: number): string {
  if (points.length === 0) return "";
  const line = monotonePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line}L${last.x},${baseY}L${first.x},${baseY}Z`;
}

/** Cung tròn của biểu đồ vành khuyên (góc tính theo radian, 0 = 12 giờ, theo chiều kim đồng hồ). */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = Math.min(end - start, Math.PI * 2 - 1e-4);
  const x0 = cx + r * Math.sin(start);
  const y0 = cy - r * Math.cos(start);
  const x1 = cx + r * Math.sin(start + sweep);
  const y1 = cy - r * Math.cos(start + sweep);
  const large = sweep > Math.PI ? 1 : 0;
  return `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}`;
}

/** Màu chuỗi dữ liệu theo token CSS: xanh Zalo, xanh ngọc, hổ phách, xanh đậm, xanh trời — không dùng tím (tím dành cho AI). */
export const seriesColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-2)"] as const;
