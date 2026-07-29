import { applyItemToPoints, applyItemToSampleOptions, ITEM_TYPES, mirrorFn } from '../items';

describe('applyItemToSampleOptions', () => {
  it('mirror: đảo hướng bắn (T8.2 acceptance — đường cong lật hướng đúng)', () => {
    const { direction, xMax } = applyItemToSampleOptions(ITEM_TYPES.MIRROR, 1, 15);
    expect(direction).toBe(-1);
    expect(xMax).toBe(15);
  });

  it('mirror: đảo lại từ -1 → 1', () => {
    const { direction } = applyItemToSampleOptions(ITEM_TYPES.MIRROR, -1, 15);
    expect(direction).toBe(1);
  });

  it('rangeUp: tăng gấp đôi xMax, giữ nguyên hướng', () => {
    const { direction, xMax } = applyItemToSampleOptions(ITEM_TYPES.RANGE_UP, 1, 15);
    expect(direction).toBe(1);
    expect(xMax).toBe(30);
  });

  it('item không ảnh hưởng sample options (flipX/flipY/double) → giữ nguyên', () => {
    expect(applyItemToSampleOptions(ITEM_TYPES.FLIP_X, 1, 15)).toEqual({ direction: 1, xMax: 15 });
    expect(applyItemToSampleOptions(ITEM_TYPES.DOUBLE, -1, 10)).toEqual({ direction: -1, xMax: 10 });
  });
});

describe('applyItemToPoints', () => {
  const origin = { x: 100, y: 200 };

  it('flipY: lật đường cong qua trục ngang tại origin', () => {
    const pts = [{ x: 110, y: 190 }, { x: 120, y: 170 }];
    const flipped = applyItemToPoints(ITEM_TYPES.FLIP_Y, pts, origin);
    expect(flipped).toEqual([{ x: 110, y: 210 }, { x: 120, y: 230 }]);
  });

  it('flipX: lật đường cong qua trục dọc tại origin', () => {
    const pts = [{ x: 110, y: 190 }, { x: 80, y: 170 }];
    const flipped = applyItemToPoints(ITEM_TYPES.FLIP_X, pts, origin);
    expect(flipped).toEqual([{ x: 90, y: 190 }, { x: 120, y: 170 }]);
  });

  it('item không lật điểm (mirror/rangeUp/double) → giữ nguyên mảng điểm', () => {
    const pts = [{ x: 110, y: 190 }];
    expect(applyItemToPoints(ITEM_TYPES.MIRROR, pts, origin)).toEqual(pts);
    expect(applyItemToPoints(ITEM_TYPES.RANGE_UP, pts, origin)).toEqual(pts);
  });
});

describe('mirrorFn', () => {
  it('trả về -f(x)', () => {
    const fn = (x) => x * x;
    const mirrored = mirrorFn(fn);
    expect(mirrored(3)).toBe(-9);
    expect(mirrored(2)).toBe(-4);
  });
});
