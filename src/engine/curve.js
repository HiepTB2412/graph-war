import { toScreen } from './coords';

// sampleCurve — quét ux từ 0 tới xMax theo bước step, tính uy = fn(ux) rồi đổi sang pixel.
// Bỏ qua điểm không hữu hạn (NaN/Infinity). Giới hạn maxSlope/bounds sẽ thêm ở Phase 4 (T4.3).
export function sampleCurve(fn, origin, { pixelsPerUnit, direction = 1, xMax, step }) {
  const pts = [];
  for (let ux = 0; ux <= xMax; ux += step) {
    const uy = fn(ux);
    if (!isFinite(uy)) continue;
    pts.push(toScreen(origin, ux, uy, { pixelsPerUnit, direction }));
  }
  return pts;
}

// toPathD — chuyển mảng điểm {x,y} thành chuỗi path SVG: "M x y L x y L x y ..."
export function toPathD(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}
