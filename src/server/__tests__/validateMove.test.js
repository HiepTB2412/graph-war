import { validateFireMove } from '../validateMove';
import { polynomialOnly, chaos } from '../../game/rules';

describe('validateFireMove (T11.3 scaffold)', () => {
  it('move hợp lệ theo rules server → ok', () => {
    expect(validateFireMove({ type: 'fire', expr: 'x^2' }, polynomialOnly)).toEqual({
      ok: true,
      reason: '',
    });
  });

  it('client tự gắn rules lỏng lẻo không có tác dụng — server dùng rules của chính mình', () => {
    // Giả sử client gửi move hợp lệ theo rules RIÊNG của nó, nhưng server luôn dùng rules
    // đã lưu phía server (polynomialOnly ở đây) bất kể move chứa gì khác.
    const move = { type: 'fire', expr: 'sin(x)' };
    expect(validateFireMove(move, polynomialOnly).ok).toBe(false);
    expect(validateFireMove(move, chaos).ok).toBe(true);
  });

  it('hàm cấm (ngoài whitelist) → từ chối, kèm lý do', () => {
    const result = validateFireMove({ type: 'fire', expr: 'sin(x)' }, polynomialOnly);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Cấm hàm sin/);
  });

  it('không phải move bắn (vd move di chuyển) → từ chối', () => {
    expect(validateFireMove({ type: 'move', playerId: 'p1' }, chaos).ok).toBe(false);
  });

  it('thiếu expr → từ chối', () => {
    expect(validateFireMove({ type: 'fire', expr: '' }, chaos).ok).toBe(false);
    expect(validateFireMove({ type: 'fire' }, chaos).ok).toBe(false);
  });
});
