import { compileFunction, analyze } from '../astGuard';
import { chaos, noSquare, polynomialOnly, requireParenMatch } from '../../game/rules';

describe('compileFunction', () => {
  it('biên dịch và tính đúng giá trị (sin(x)+x tại 0)', () => {
    const fn = compileFunction('sin(x)+x');
    expect(fn(0)).toBe(0);
  });

  it('tính đúng đa thức', () => {
    const fn = compileFunction('x^2');
    expect(fn(3)).toBe(9);
  });

  it('trả NaN khi kết quả không phải số thực (vd sqrt số âm ra số phức)', () => {
    const fn = compileFunction('sqrt(x)');
    expect(Number.isNaN(fn(-1))).toBe(true);
  });

  it('ném lỗi cú pháp ngay lúc compile, không đợi tới lúc gọi', () => {
    expect(() => compileFunction('x^')).toThrow();
    expect(() => compileFunction('sin(')).toThrow();
  });
});

describe('analyze', () => {
  it('hợp lệ — tính đúng mana và bậc (sin(x)+x^2 = 4+1+3 = 8)', () => {
    const result = analyze('sin(x)+x^2', chaos);
    expect(result.ok).toBe(true);
    expect(result.mana).toBe(8);
    expect(result.degree).toBe(2);
  });

  it('vượt mana → từ chối', () => {
    // x^3 + x^3 = 5 + 5 + 1(add) = 11 > maxMana(10) của polynomialOnly
    const result = analyze('x^3+x^3', polynomialOnly);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/mana/i);
  });

  it('hàm cấm (ngoài whitelist của trận) → từ chối', () => {
    const result = analyze('sin(x)', polynomialOnly);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Cấm hàm sin/);
  });

  it('cấm chia — chặn pole kiểu 1/(x-1)', () => {
    const result = analyze('1/(x-1)', chaos);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/chia/i);
  });

  it('bậc quá cao → từ chối (x^9 vượt maxDeg)', () => {
    const result = analyze('x^9', polynomialOnly);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Bậc quá cao/);
  });

  it('thiếu ngoặc trong trận yêu cầu ngoặc → từ chối', () => {
    const missing = analyze('x+1', requireParenMatch);
    expect(missing.ok).toBe(false);
    expect(missing.reason).toMatch(/ngoặc/);

    const withParen = analyze('(x+1)*2', requireParenMatch);
    expect(withParen.ok).toBe(true);
  });

  it('trận cấm x^2 (banPow2) — từ chối x^2, nhận x^3', () => {
    const banned = analyze('x^2', noSquare);
    expect(banned.ok).toBe(false);
    expect(banned.reason).toMatch(/cấm x\^2/);

    const allowed = analyze('x^3', noSquare);
    expect(allowed.ok).toBe(true);
  });

  it('hệ số quá lớn trong sin/cos/tan (dao động quá nhanh) → từ chối', () => {
    const result = analyze('sin(999*x)', chaos);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/quá lớn/);
  });

  it('biểu thức quá dài (vượt maxNodes) → từ chối', () => {
    const tightRule = { ...polynomialOnly, maxNodes: 3 };
    const result = analyze('x+1+1+1', tightRule);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/quá dài/);
  });

  it('sai cú pháp → ok=false, mana=0', () => {
    const result = analyze('x^', chaos);
    expect(result.ok).toBe(false);
    expect(result.mana).toBe(0);
  });
});
