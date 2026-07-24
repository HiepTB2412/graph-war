import { toScreen } from '../coords';

describe('toScreen', () => {
  it('trả về đúng origin khi ux=uy=0', () => {
    expect(toScreen({ x: 100, y: 200 }, 0, 0, { pixelsPerUnit: 34 })).toEqual({
      x: 100,
      y: 200,
    });
  });

  it('đảo trục y: uy dương phải đi lên (y pixel giảm)', () => {
    const p = toScreen({ x: 0, y: 0 }, 0, 1, { pixelsPerUnit: 10 });
    expect(p.y).toBe(-10);
  });

  it('direction = -1 lật đường cong sang trái', () => {
    const p = toScreen({ x: 0, y: 0 }, 5, 0, { pixelsPerUnit: 10, direction: -1 });
    expect(p.x).toBe(-50);
  });
});
