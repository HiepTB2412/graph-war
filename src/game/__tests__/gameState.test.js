import { createInitialState, gameReducer, shooterDirection, TURN_PHASE } from '../gameState';
import { ANGLE_MAX, DEFAULT_MANA } from '../../config';

describe('gameReducer', () => {
  it('FIRE chuyển phase aiming → firing', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, { type: 'FIRE' });
    expect(next.phase).toBe(TURN_PHASE.FIRING);
  });

  it('FIRE không có tác dụng khi không ở phase aiming', () => {
    const firing = { ...createInitialState(360, 640), phase: TURN_PHASE.FIRING };
    expect(gameReducer(firing, { type: 'FIRE' })).toBe(firing);
  });

  it('NEXT_TURN xoay vòng qua người chưa loại', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, { type: 'NEXT_TURN' });
    expect(next.currentPlayerId).toBe('p2');
    expect(next.phase).toBe(TURN_PHASE.AIMING);
    const back = gameReducer(next, { type: 'NEXT_TURN' });
    expect(back.currentPlayerId).toBe('p1');
  });

  it('NEXT_TURN bỏ qua người đã loại (3 người chơi)', () => {
    const base = createInitialState(360, 640);
    const threePlayers = {
      ...base,
      players: [...base.players, { id: 'p3', label: 'P3', eliminated: false, mana: DEFAULT_MANA }],
    };
    const eliminated = gameReducer(threePlayers, { type: 'ELIMINATE', playerId: 'p2' });
    const next = gameReducer(eliminated, { type: 'NEXT_TURN' });
    expect(next.currentPlayerId).toBe('p3');
  });

  it('ELIMINATE đánh dấu người chơi bị loại', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, { type: 'ELIMINATE', playerId: 'p2' });
    expect(next.players.find((p) => p.id === 'p2').eliminated).toBe(true);
  });

  it('ELIMINATE còn 1 người sống → phase over + winnerId (T6.3)', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, { type: 'ELIMINATE', playerId: 'p2' });
    expect(next.phase).toBe(TURN_PHASE.OVER);
    expect(next.winnerId).toBe('p1');
  });

  it('NEXT_TURN không làm gì khi phase đã over', () => {
    const state = createInitialState(360, 640);
    const over = gameReducer(state, { type: 'ELIMINATE', playerId: 'p2' });
    expect(gameReducer(over, { type: 'NEXT_TURN' })).toBe(over);
  });

  it('NEXT_TURN reset mana người chơi kế tiếp về DEFAULT_MANA (T6.5)', () => {
    const base = createInitialState(360, 640);
    const depleted = {
      ...base,
      players: base.players.map((p) => (p.id === 'p2' ? { ...p, mana: 0 } : p)),
    };
    const next = gameReducer(depleted, { type: 'NEXT_TURN' });
    expect(next.players.find((p) => p.id === 'p2').mana).toBe(DEFAULT_MANA);
  });

  it('SET_ANGLE cập nhật góc của đúng người chơi (T7.2)', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, { type: 'SET_ANGLE', playerId: 'p1', angle: 30 });
    expect(next.players.find((p) => p.id === 'p1').angle).toBe(30);
    expect(next.players.find((p) => p.id === 'p2').angle).toBe(0);
  });

  it('SET_ANGLE bị kẹp trong [-ANGLE_MAX, ANGLE_MAX]', () => {
    const state = createInitialState(360, 640);
    const over = gameReducer(state, { type: 'SET_ANGLE', playerId: 'p1', angle: ANGLE_MAX + 50 });
    expect(over.players.find((p) => p.id === 'p1').angle).toBe(ANGLE_MAX);
    const under = gameReducer(state, { type: 'SET_ANGLE', playerId: 'p1', angle: -ANGLE_MAX - 50 });
    expect(under.players.find((p) => p.id === 'p1').angle).toBe(-ANGLE_MAX);
  });

  it('SET_ANGLE không có tác dụng ngoài phase aiming', () => {
    const firing = { ...createInitialState(360, 640), phase: TURN_PHASE.FIRING };
    expect(gameReducer(firing, { type: 'SET_ANGLE', playerId: 'p1', angle: 20 })).toBe(firing);
  });

  it('shooterDirection: P1 bắn phải (+1), P2 bắn trái (-1)', () => {
    expect(shooterDirection({ id: 'p1' })).toBe(1);
    expect(shooterDirection({ id: 'p2' })).toBe(-1);
  });

  it('MOVE dịch chuyển đúng người chơi theo dx/dy và hết lượt là hành động riêng (T8.1)', () => {
    const state = createInitialState(360, 640);
    const p1 = state.players.find((p) => p.id === 'p1');
    const next = gameReducer(state, {
      type: 'MOVE',
      playerId: 'p1',
      dx: 34,
      dy: -68,
      bounds: { w: 360, h: 640 },
    });
    const movedP1 = next.players.find((p) => p.id === 'p1');
    expect(movedP1.x).toBe(p1.x + 34);
    expect(movedP1.y).toBe(p1.y - 68);
    // MOVE không tự chuyển lượt — GameScreen dispatch NEXT_TURN riêng sau đó.
    expect(next.phase).toBe(TURN_PHASE.AIMING);
  });

  it('MOVE bị kẹp trong bounds màn hình (trừ bán kính hitbox)', () => {
    const state = createInitialState(360, 640);
    const next = gameReducer(state, {
      type: 'MOVE',
      playerId: 'p1',
      dx: -9999,
      dy: -9999,
      bounds: { w: 360, h: 640 },
    });
    const p1 = next.players.find((p) => p.id === 'p1');
    expect(p1.x).toBe(p1.radius);
    expect(p1.y).toBe(p1.radius);
  });

  it('MOVE không có tác dụng ngoài phase aiming', () => {
    const firing = { ...createInitialState(360, 640), phase: TURN_PHASE.FIRING };
    expect(
      gameReducer(firing, { type: 'MOVE', playerId: 'p1', dx: 10, dy: 0, bounds: { w: 360, h: 640 } })
    ).toBe(firing);
  });

  it('USE_ITEM tiêu hao đúng vật phẩm khỏi túi đồ của đúng người chơi (T8.3)', () => {
    const state = createInitialState(360, 640);
    const p1Items = state.players.find((p) => p.id === 'p1').items;
    expect(p1Items.length).toBeGreaterThan(0);
    const itemId = p1Items[0];
    const next = gameReducer(state, { type: 'USE_ITEM', playerId: 'p1', itemId });
    const p1After = next.players.find((p) => p.id === 'p1');
    const p2After = next.players.find((p) => p.id === 'p2');
    expect(p1After.items).not.toContain(itemId);
    expect(p1After.items.length).toBe(p1Items.length - 1);
    expect(p2After.items).toEqual(state.players.find((p) => p.id === 'p2').items);
  });

  it('RESET trả về trạng thái khởi tạo mới', () => {
    const state = createInitialState(360, 640);
    const over = gameReducer(state, { type: 'ELIMINATE', playerId: 'p2' });
    const reset = gameReducer(over, { type: 'RESET', width: 360, height: 640 });
    expect(reset.phase).toBe(TURN_PHASE.AIMING);
    expect(reset.winnerId).toBeNull();
    expect(reset.players.every((p) => !p.eliminated)).toBe(true);
  });
});
