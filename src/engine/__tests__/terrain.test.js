import {
  applyTerrain,
  findPortalPair,
  findTerrainHit,
  pointInRect,
  reflectPoints,
  TERRAIN_TYPES,
} from '../terrain';

describe('pointInRect', () => {
  it('điểm bên trong hình chữ nhật → true', () => {
    expect(pointInRect({ x: 5, y: 5 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
  });

  it('điểm bên ngoài hình chữ nhật → false', () => {
    expect(pointInRect({ x: 20, y: 5 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('điểm đúng biên → true (bao gồm biên)', () => {
    expect(pointInRect({ x: 10, y: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
  });
});

describe('findTerrainHit', () => {
  it('trả về terrain đầu tiên chứa điểm, bỏ qua terrain không chứa điểm', () => {
    const terrain = [
      { type: TERRAIN_TYPES.WALL, x: 100, y: 100, w: 10, h: 10 },
      { type: TERRAIN_TYPES.PIT, x: 0, y: 0, w: 10, h: 10 },
    ];
    expect(findTerrainHit({ x: 5, y: 5 }, terrain)).toBe(terrain[1]);
  });

  it('không chạm terrain nào → null', () => {
    const terrain = [{ type: TERRAIN_TYPES.WALL, x: 100, y: 100, w: 10, h: 10 }];
    expect(findTerrainHit({ x: 5, y: 5 }, terrain)).toBeNull();
  });
});

describe('reflectPoints (T7.1-style, dùng cho T9.3)', () => {
  it('lật điểm qua đường thẳng đứng (pháp tuyến nằm ngang) → bật lại đúng góc', () => {
    const pivot = { x: 100, y: 50 };
    const normal = { x: 1, y: 0 };
    const [reflected] = reflectPoints([{ x: 110, y: 50 }], pivot, normal);
    expect(reflected.x).toBeCloseTo(90);
    expect(reflected.y).toBeCloseTo(50);
  });

  it('chuẩn hoá normal chưa phải vector đơn vị', () => {
    const pivot = { x: 0, y: 0 };
    const normal = { x: 5, y: 0 };
    const [reflected] = reflectPoints([{ x: 10, y: 3 }], pivot, normal);
    expect(reflected.x).toBeCloseTo(-10);
    expect(reflected.y).toBeCloseTo(3);
  });

  it('điểm nằm đúng trên mặt phản xạ → giữ nguyên', () => {
    const pivot = { x: 20, y: 20 };
    const normal = { x: 0, y: 1 };
    const [reflected] = reflectPoints([{ x: 50, y: 20 }], pivot, normal);
    expect(reflected.x).toBeCloseTo(50);
    expect(reflected.y).toBeCloseTo(20);
  });
});

describe('findPortalPair', () => {
  const terrain = [
    { type: TERRAIN_TYPES.PORTAL, id: 'A', pairId: 'gate1', x: 0, y: 0, w: 10, h: 10 },
    { type: TERRAIN_TYPES.PORTAL, id: 'B', pairId: 'gate1', x: 200, y: 0, w: 10, h: 10 },
  ];

  it('tìm đúng cổng ghép đôi (khác id, cùng pairId)', () => {
    expect(findPortalPair(terrain, terrain[0])).toBe(terrain[1]);
    expect(findPortalPair(terrain, terrain[1])).toBe(terrain[0]);
  });

  it('không có cặp → undefined', () => {
    const lone = { type: TERRAIN_TYPES.PORTAL, id: 'C', pairId: 'gate2', x: 0, y: 0, w: 10, h: 10 };
    expect(findPortalPair(terrain, lone)).toBeUndefined();
  });
});

describe('applyTerrain', () => {
  it('không có terrain → trả nguyên mảng điểm', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    expect(applyTerrain(pts, [])).toBe(pts);
  });

  it('wall: cắt đường cong tại điểm chạm tường (T9.2 acceptance)', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 150, y: 0 }];
    const terrain = [{ type: TERRAIN_TYPES.WALL, x: 90, y: -10, w: 20, h: 20 }];
    const result = applyTerrain(pts, terrain);
    expect(result).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]);
  });

  it('pit: cắt đường cong tại điểm chạm hố, giống hành vi tường (T9.2)', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }];
    const terrain = [{ type: TERRAIN_TYPES.PIT, x: 90, y: -10, w: 20, h: 20 }];
    const result = applyTerrain(pts, terrain);
    expect(result).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]);
  });

  it('reflector: đổi hướng phần đường cong còn lại, bật ngược đúng góc (T9.3 acceptance)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 }, // điểm chạm — nằm trong reflector
      { x: 110, y: 0 }, // đáng lẽ đi tiếp sang phải → phải bật ngược lại
      { x: 120, y: 0 },
    ];
    const terrain = [
      { type: TERRAIN_TYPES.REFLECTOR, x: 95, y: -10, w: 10, h: 20, normal: { x: 1, y: 0 } },
    ];
    const result = applyTerrain(pts, terrain);
    expect(result.slice(0, 3)).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]);
    expect(result[3].x).toBeCloseTo(90); // 110 lật qua x=100 → 90
    expect(result[4].x).toBeCloseTo(80); // 120 lật qua x=100 → 80
  });

  it('portal: dịch chuyển phần còn lại sang cổng ghép đôi, tiếp tục liên tục (T9.4 acceptance)', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 }, // chạm cổng A
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const terrain = [
      { type: TERRAIN_TYPES.PORTAL, id: 'A', pairId: 'g', x: 5, y: -5, w: 10, h: 10 },
      { type: TERRAIN_TYPES.PORTAL, id: 'B', pairId: 'g', x: 295, y: -5, w: 10, h: 10 },
    ];
    const result = applyTerrain(pts, terrain);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 10, y: 0 });
    // cổng B center = (300, 0); offset = (300-10, 0) = (290, 0)
    expect(result[2].x).toBeCloseTo(20 + 290);
    expect(result[3].x).toBeCloseTo(30 + 290);
  });

  it('portal lẻ (không có cặp) → chặn như tường', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    const terrain = [{ type: TERRAIN_TYPES.PORTAL, id: 'A', pairId: 'lonely', x: 5, y: -5, w: 10, h: 10 }];
    const result = applyTerrain(pts, terrain);
    expect(result).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it('không chạm terrain nào → trả nguyên mảng điểm', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const terrain = [{ type: TERRAIN_TYPES.WALL, x: 1000, y: 1000, w: 10, h: 10 }];
    expect(applyTerrain(pts, terrain)).toEqual(pts);
  });
});
