// classify.js — Chế độ học (cơ chế 9, T10.1): suy ra nhãn mô tả dạng hàm từ đúng
// { degree, fnNames } mà astGuard.analyze() đã tính sẵn trong một lượt duyệt AST (spec mục
// 10: "Dữ liệu đã có sẵn từ analyze()") — không parse lại biểu thức lần hai. Chạy song song,
// không chặn tiến độ chơi: chỉ mô tả, không ảnh hưởng luật/mana.
//
// Nhãn viết thường vì luôn được ghép sau "Đây là " ở nơi hiển thị (vd "Đây là parabol (bậc 2)").
const FN_LABELS = {
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  sqrt: 'căn bậc hai',
  log: 'logarit',
  abs: 'trị tuyệt đối',
};

const DEGREE_LABELS = {
  0: 'hằng số',
  1: 'hàm bậc nhất',
  2: 'parabol (bậc 2)',
  3: 'hàm bậc 3',
};

// classifyAnalysis — biểu thức chỉ chứa ĐÚNG MỘT hàm đặc trưng (sin/cos/.../abs) → nhãn theo
// hàm đó; nhiều hàm khác nhau → liệt kê "kết hợp"; không có hàm nào (đa thức thuần) → nhãn
// theo degree.
export function classifyAnalysis({ degree = 0, fnNames = [] } = {}) {
  const known = fnNames.filter((name) => FN_LABELS[name]);

  if (known.length === 1) {
    return FN_LABELS[known[0]];
  }
  if (known.length > 1) {
    return `kết hợp nhiều dạng (${known.map((name) => FN_LABELS[name]).join(', ')})`;
  }
  return DEGREE_LABELS[degree] ?? `đa thức bậc ${degree}`;
}
