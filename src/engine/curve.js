import { toScreen } from './coords';

// sampleCurve — quét ux từ 0 tới xMax theo bước step, tính uy = fn(ux) rồi đổi sang pixel.
// Bỏ qua điểm không hữu hạn (NaN/Infinity). Dừng hẳn (break) khi ra ngoài `bounds` màn hình
// hoặc khi |Δy| giữa hai điểm liên tiếp vượt `maxSlope` (dốc đứng/dao động quá nhanh, T4.3).
// Cả hai tham số là tuỳ chọn — bỏ qua thì không cắt (dùng cho test/Phase 1-3).
export function sampleCurve(fn, origin, { pixelsPerUnit, direction = 1, xMax, step, bounds, maxSlope }) {
  const pts = [];
  let prev = null;
  for (let ux = 0; ux <= xMax; ux += step) {
    const uy = fn(ux);
    if (!isFinite(uy)) continue;
    const p = toScreen(origin, ux, uy, { pixelsPerUnit, direction });
    if (bounds && (p.x < 0 || p.x > bounds.w || p.y < -50 || p.y > bounds.h + 50)) break;
    if (maxSlope != null && prev && Math.abs(p.y - prev.y) > maxSlope) break;
    pts.push(p);
    prev = p;
  }
  return pts;
}

// toPathD — chuyển mảng điểm {x,y} thành chuỗi path SVG: "M x y L x y L x y ..."
export function toPathD(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}
