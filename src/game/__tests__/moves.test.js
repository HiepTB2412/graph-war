import { applyMove, createFireMove, createMoveMove, resolveFireMove } from '../moves';
import { createInitialState, TURN_PHASE } from '../gameState';

const BOUNDS = { w: 360, h: 640 };

describe('resolveFireMove', () => {
  it('bắn trúng p2 với hàm hằng số 0 (đường ngang cùng độ cao hai người chơi)', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '0', angle: 0, bounds: BOUNDS });
    const { curvesPts, hit } = resolveFireMove(state, move);
    expect(curvesPts).toHaveLength(1);
    expect(hit).not.toBeNull();
    expect(hit.hitId).toBe('p2');
  });

  it('bắn trượt khi đường cong đi ra ngoài màn hình ngay lập tức', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '20', angle: 0, bounds: BOUNDS });
    const { hit } = resolveFireMove(state, move);
    expect(hit).toBeNull();
  });

  it('vật phẩm mirror đảo hướng bắn → đi sang trái, không trúng p2 ở bên phải', () => {
    const state = createInitialState(360, 640);
    const p1 = state.players.find((p) => p.id === 'p1');
    const move = createFireMove({ playerId: 'p1', expr: '0', angle: 0, itemId: 'mirror', bounds: BOUNDS });
    const { hit, curvesPts } = resolveFireMove(state, move);
    expect(hit).toBeNull();
    const lastPoint = curvesPts[0][curvesPts[0].length - 1];
    expect(lastPoint.x).toBeLessThan(p1.x);
  });

  it('vật phẩm double sinh ra 2 đường cong song song', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '0', angle: 0, itemId: 'double', bounds: BOUNDS });
    const { curvesPts } = resolveFireMove(state, move);
    expect(curvesPts).toHaveLength(2);
  });

  it('dùng move.angle thay vì player.angle hiện tại (góc đã chốt lúc bắn, không đọc lại state)', () => {
    const state = createInitialState(360, 640);
    const straight = resolveFireMove(
      state,
      createFireMove({ playerId: 'p1', expr: '0', angle: 0, bounds: BOUNDS })
    );
    const angled = resolveFireMove(
      state,
      createFireMove({ playerId: 'p1', expr: '0', angle: 45, bounds: BOUNDS })
    );
    expect(straight.curvesPts[0]).not.toEqual(angled.curvesPts[0]);
  });
});

describe('applyMove', () => {
  it('fire move trúng → ELIMINATE + NEXT_TURN; còn 1 người sống → phase over (T11.2)', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '0', angle: 0, bounds: BOUNDS });
    const resolved = resolveFireMove(state, move);
    const next = applyMove(state, move, resolved);
    expect(next.players.find((p) => p.id === 'p2').eliminated).toBe(true);
    expect(next.phase).toBe(TURN_PHASE.OVER);
    expect(next.winnerId).toBe('p1');
  });

  it('fire move trượt → chuyển lượt sang p2, không ai bị loại', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '20', angle: 0, bounds: BOUNDS });
    const resolved = resolveFireMove(state, move);
    const next = applyMove(state, move, resolved);
    expect(next.players.every((p) => !p.eliminated)).toBe(true);
    expect(next.currentPlayerId).toBe('p2');
    expect(next.phase).toBe(TURN_PHASE.AIMING);
  });

  it('fire move dùng vật phẩm → tiêu hao đúng vật phẩm khỏi túi đồ người bắn', () => {
    const state = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '20', angle: 0, itemId: 'mirror', bounds: BOUNDS });
    const resolved = resolveFireMove(state, move);
    const next = applyMove(state, move, resolved);
    expect(next.players.find((p) => p.id === 'p1').items).not.toContain('mirror');
  });

  it('move move → đổi vị trí đúng dx/dy + chuyển lượt (T8.1 dùng lại qua mạng)', () => {
    const state = createInitialState(360, 640);
    const p1Before = state.players.find((p) => p.id === 'p1');
    const move = createMoveMove({ playerId: 'p1', dx: 34, dy: 0, bounds: BOUNDS });
    const next = applyMove(state, move);
    const p1After = next.players.find((p) => p.id === 'p1');
    expect(p1After.x).toBe(p1Before.x + 34);
    expect(next.currentPlayerId).toBe('p2');
  });

  it('action lạ không khớp fire/move → trả nguyên state', () => {
    const state = createInitialState(360, 640);
    expect(applyMove(state, { type: 'unknown' })).toBe(state);
  });

  it('hai state khởi tạo giống nhau + cùng move → dựng lại state kết quả giống hệt nhau', () => {
    const stateA = createInitialState(360, 640);
    const stateB = createInitialState(360, 640);
    const move = createFireMove({ playerId: 'p1', expr: '0', angle: 0, bounds: BOUNDS });

    const resolvedA = resolveFireMove(stateA, move);
    const resolvedB = resolveFireMove(stateB, move);
    expect(resolvedA).toEqual(resolvedB);

    const nextA = applyMove(stateA, move, resolvedA);
    const nextB = applyMove(stateB, move, resolvedB);
    expect(nextA).toEqual(nextB);
  });
});
