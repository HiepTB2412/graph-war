import { rotate } from '../transforms';

describe('rotate', () => {
  it('xoay 90° điểm (origin.x+10, origin.y) → (origin.x, origin.y+10) (T7.1)', () => {
    const origin = { x: 50, y: 80 };
    const [p] = rotate([{ x: origin.x + 10, y: origin.y }], origin, 90);
    expect(p.x).toBeCloseTo(origin.x);
    expect(p.y).toBeCloseTo(origin.y + 10);
  });

  it('xoay 90° điểm phía trên origin → phía phải (nhất quán chiều kim đồng hồ)', () => {
    const origin = { x: 100, y: 200 };
    const [p] = rotate([{ x: origin.x, y: origin.y - 10 }], origin, 90);
    expect(p.x).toBeCloseTo(origin.x + 10);
    expect(p.y).toBeCloseTo(origin.y);
  });

  it('xoay 0° giữ nguyên toạ độ', () => {
    const origin = { x: 0, y: 0 };
    const pts = [{ x: 5, y: 5 }, { x: -3, y: 2 }];
    const rotated = rotate(pts, origin, 0);
    rotated.forEach((p, i) => {
      expect(p.x).toBeCloseTo(pts[i].x);
      expect(p.y).toBeCloseTo(pts[i].y);
    });
  });

  it('mảng rỗng trả về mảng rỗng', () => {
    expect(rotate([], { x: 0, y: 0 }, 45)).toEqual([]);
  });
});
