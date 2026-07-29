// transforms.js — rotate(pts, origin, deg): xoay từng điểm quanh origin theo góc deg (độ),
// dùng cho cơ chế xoay hệ trục (Phase 7, spec mục 6.2). Hệ toạ độ màn hình y đi xuống nên
// deg dương xoay theo chiều kim đồng hồ khi nhìn trên màn hình.
export function rotate(pts, origin, deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return pts.map((p) => {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
  });
}
