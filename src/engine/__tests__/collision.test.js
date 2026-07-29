import { checkCollision } from '../collision';

function makePlayer(overrides) {
  return {
    id: 'p2',
    label: 'P2',
    x: 100,
    y: 0,
    radius: 20,
    eliminated: false,
    ...overrides,
  };
}

describe('checkCollision', () => {
  it('điểm nằm trong bán kính người chơi → trả hitId', () => {
    const pts = [{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 200, y: 0 }];
    const players = [makePlayer()];
    const result = checkCollision(pts, players, 'p1');
    expect(result).toEqual({ hitId: 'p2', at: { x: 90, y: 0 } });
  });

  it('không có điểm nào trong bán kính → trả null', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const players = [makePlayer()];
    expect(checkCollision(pts, players, 'p1')).toBeNull();
  });

  it('bỏ qua chính người bắn (không tự trúng đạn)', () => {
    const pts = [{ x: 0, y: 0 }];
    const players = [makePlayer({ id: 'p1', x: 0, y: 0 })];
    expect(checkCollision(pts, players, 'p1')).toBeNull();
  });

  it('bỏ qua người chơi đã bị loại', () => {
    const pts = [{ x: 100, y: 0 }];
    const players = [makePlayer({ eliminated: true })];
    expect(checkCollision(pts, players, 'p1')).toBeNull();
  });

  it('trúng đúng biên bán kính (dx*dx+dy*dy === radius*radius)', () => {
    const pts = [{ x: 120, y: 0 }];
    const players = [makePlayer({ x: 100, radius: 20 })];
    expect(checkCollision(pts, players, 'p1')).toEqual({ hitId: 'p2', at: { x: 120, y: 0 } });
  });

  it('nhiều người chơi: trả về người đầu tiên trúng theo thứ tự điểm trên đường cong', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
    const players = [makePlayer({ id: 'p3', x: 200, y: 0 }), makePlayer({ id: 'p2', x: 100, y: 0 })];
    expect(checkCollision(pts, players, 'p1').hitId).toBe('p2');
  });
});
