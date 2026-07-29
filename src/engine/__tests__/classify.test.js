import { classifyAnalysis } from '../classify';
import { analyze } from '../astGuard';
import { chaos } from '../../game/rules';

describe('classifyAnalysis', () => {
  it('x^2 → parabol (bậc 2) (T10.1 acceptance)', () => {
    expect(classifyAnalysis({ degree: 2, fnNames: [] })).toBe('parabol (bậc 2)');
  });

  it('degree 0 → hằng số', () => {
    expect(classifyAnalysis({ degree: 0, fnNames: [] })).toBe('hằng số');
  });

  it('degree 1 → hàm bậc nhất', () => {
    expect(classifyAnalysis({ degree: 1, fnNames: [] })).toBe('hàm bậc nhất');
  });

  it('degree 3 → hàm bậc 3', () => {
    expect(classifyAnalysis({ degree: 3, fnNames: [] })).toBe('hàm bậc 3');
  });

  it('degree cao không có nhãn riêng → đa thức bậc N', () => {
    expect(classifyAnalysis({ degree: 5, fnNames: [] })).toBe('đa thức bậc 5');
  });

  it('chỉ một hàm đặc trưng → nhãn theo hàm đó (vd sin)', () => {
    expect(classifyAnalysis({ degree: 0, fnNames: ['sin'] })).toBe('sin');
    expect(classifyAnalysis({ degree: 0, fnNames: ['sqrt'] })).toBe('căn bậc hai');
  });

  it('nhiều hàm khác nhau → liệt kê kết hợp', () => {
    expect(classifyAnalysis({ degree: 0, fnNames: ['sin', 'cos'] })).toBe(
      'kết hợp nhiều dạng (sin, cos)'
    );
  });

  it('không truyền gì (mặc định) → hằng số', () => {
    expect(classifyAnalysis()).toBe('hằng số');
  });
});

describe('analyze fnNames (mở rộng cho T10.1)', () => {
  it('trả về danh sách tên hàm xuất hiện trong biểu thức', () => {
    const result = analyze('sin(x)+cos(x)', chaos);
    expect(result.fnNames.sort()).toEqual(['cos', 'sin']);
  });

  it('đa thức thuần → fnNames rỗng', () => {
    const result = analyze('x^2+3*x-1', chaos);
    expect(result.fnNames).toEqual([]);
  });

  it('sai cú pháp → fnNames rỗng', () => {
    const result = analyze('x^', chaos);
    expect(result.fnNames).toEqual([]);
  });
});
