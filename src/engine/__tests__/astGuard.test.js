import { compileFunction } from '../astGuard';

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
