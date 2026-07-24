import { sampleCurve, toPathD } from '../curve';

const origin = { x: 0, y: 0 };
const opts = { pixelsPerUnit: 10, direction: 1, xMax: 5, step: 1 };

describe('sampleCurve', () => {
  it('sinh mảng điểm x tăng dần, không NaN', () => {
    const pts = sampleCurve((x) => x * x, origin, opts);
    expect(pts.length).toBeGreaterThan(0);
    for (const p of pts) {
      expect(Number.isNaN(p.x)).toBe(false);
      expect(Number.isNaN(p.y)).toBe(false);
    }
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
    }
  });

  it('bỏ qua điểm không hữu hạn (vd chia cho 0)', () => {
    const pts = sampleCurve((x) => (x === 0 ? Infinity : 1 / x), origin, opts);
    expect(pts.some((p) => Number.isNaN(p.x) || !isFinite(p.y))).toBe(false);
  });

  it('y = x đi lên khi sang phải (y pixel giảm)', () => {
    const pts = sampleCurve((x) => x, origin, opts);
    expect(pts[pts.length - 1].y).toBeLessThan(pts[0].y);
  });

  it('y = -x đi xuống khi sang phải (y pixel tăng)', () => {
    const pts = sampleCurve((x) => -x, origin, opts);
    expect(pts[pts.length - 1].y).toBeGreaterThan(pts[0].y);
  });

  it('cắt đường cong khi ra ngoài bounds màn hình (T4.3)', () => {
    // x = ux*10 → ux=0,1,2,3,4,5 cho x=0,10,20,30,40,50; bounds.w=20 nên dừng sau x=20
    const pts = sampleCurve((x) => x, origin, { ...opts, bounds: { w: 20, h: 100 } });
    expect(pts.length).toBeLessThan(6);
    expect(pts[pts.length - 1].x).toBeLessThanOrEqual(20);
  });

  it('cắt đường cong khi độ dốc giữa hai điểm liên tiếp vượt maxSlope (dốc đứng, T4.3)', () => {
    const pts = sampleCurve((x) => x * 100, origin, { ...opts, maxSlope: 5 });
    expect(pts.length).toBe(1);
  });

  it('không cắt gì khi không truyền bounds/maxSlope (tương thích Phase 1-3)', () => {
    const pts = sampleCurve((x) => x, origin, opts);
    expect(pts.length).toBe(6);
  });
});

describe('toPathD', () => {
  it('bắt đầu bằng M, các đoạn sau là L', () => {
    const d = toPathD([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]);
    expect(d).toBe('M 0 0 L 1 2 L 2 4');
  });

  it('mảng rỗng trả về chuỗi rỗng', () => {
    expect(toPathD([])).toBe('');
  });
});
