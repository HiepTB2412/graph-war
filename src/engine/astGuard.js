import { parse } from 'mathjs';

// compileFunction — biên dịch biểu thức thành hàm số fn(x).
// Lỗi cú pháp (vd "x^", "sin(") ném ra ngay lúc compile để UI hiển thị thông báo.
// Lỗi lúc tính toán (vd kết quả không phải số thực) được bắt và trả NaN, không throw.
export function compileFunction(expr) {
  const compiled = parse(expr).compile();
  return (x) => {
    try {
      const result = compiled.evaluate({ x });
      return typeof result === 'number' ? result : NaN;
    } catch {
      return NaN;
    }
  };
}
