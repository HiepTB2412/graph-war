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

// Bảng giá mana (spec mục 5.1). `pow` có giá riêng theo bậc (POW_COST);
// bậc không có trong bảng (vd x^9) dùng giá mặc định COST.pow.
export const COST = {
  add: 1,
  subtract: 1,
  multiply: 2,
  divide: 2,
  pow: 3,
  sin: 4,
  cos: 4,
  tan: 8,
  sqrt: 5,
  log: 6,
  abs: 2,
};

const POW_COST = { 2: 3, 3: 5 };

const TRIG_FNS = new Set(['sin', 'cos', 'tan']);

// trigCoefficient — hệ số hằng số nhân trực tiếp với đối số của sin/cos/tan
// (vd 999 trong sin(999*x)). Chỉ nhìn phép nhân trực tiếp ở gốc của đối số,
// không suy diễn qua toàn bộ cây con — đủ để chặn kiểu cheat phổ biến nhất.
function trigCoefficient(argNode) {
  if (argNode.type === 'OperatorNode' && argNode.fn === 'unaryMinus') {
    return trigCoefficient(argNode.args[0]);
  }
  if (argNode.type === 'OperatorNode' && argNode.fn === 'multiply') {
    return argNode.args.reduce(
      (coeff, child) => (child.type === 'ConstantNode' ? coeff * Math.abs(child.value) : coeff),
      1
    );
  }
  return 1;
}

// analyze — kiểm tra loại hàm + tính mana + chống phá game, tất cả trong một lượt duyệt AST.
// rules = { allowedFns:Set, maxMana, maxDeg, maxNodes, maxTrigCoeff, requireParen, banPow2 }
//
// Chống dao động nhanh (T3.6) được chặn ở đây (mức AST, coi hệ số nhân trong sin/cos/tan),
// KHÔNG dựa vào cắt độ dốc lúc sample (MAX_SLOPE) — chọn cách này vì lỗi hiện ngay lúc gõ,
// trước khi tốn mana vẽ ra một đường cong bị cắt cụt.
export function analyze(expr, rules) {
  let node;
  try {
    node = parse(expr);
  } catch {
    return { ok: false, reason: 'Sai cú pháp', mana: 0, degree: 0 };
  }

  let mana = 0;
  let degree = 0;
  let nodes = 0;
  let ok = true;
  let reason = '';

  // flag — vi phạm đầu tiên phát hiện được thắng; các vi phạm phát hiện sau
  // không đè lý do lên nhau (mana vẫn cộng tiếp để hiển thị số thật).
  const flag = (msg) => {
    if (ok) {
      ok = false;
      reason = msg;
    }
  };

  node.traverse((n) => {
    nodes++;

    if (n.type === 'FunctionNode') {
      const name = n.fn.name;
      mana += COST[name] ?? 3;
      if (!rules.allowedFns.has(name)) {
        flag(`Cấm hàm ${name}`);
        return;
      }
      if (TRIG_FNS.has(name)) {
        const coeff = trigCoefficient(n.args[0]);
        const maxCoeff = rules.maxTrigCoeff ?? Infinity;
        if (coeff > maxCoeff) {
          flag(`Hệ số trong ${name}() quá lớn (dao động quá nhanh)`);
        }
      }
    }

    if (n.type === 'OperatorNode') {
      if (n.fn === 'divide') {
        mana += COST.divide;
        flag('Cấm chia (tránh pole 1/x)');
        return;
      }
      if (n.fn === 'pow') {
        const exp = n.args[1];
        if (exp.type === 'ConstantNode') {
          degree = Math.max(degree, exp.value);
          mana += POW_COST[exp.value] ?? COST.pow;
          if (rules.banPow2 && exp.value === 2) {
            flag('Trận này cấm x^2');
          }
        } else {
          mana += COST.pow;
        }
        return;
      }
      mana += COST[n.fn] ?? 1;
    }
  });

  if (rules.requireParen && !expr.includes('(')) {
    flag('Cần ít nhất 1 dấu ngoặc');
  }
  if (nodes > rules.maxNodes) {
    flag('Biểu thức quá dài');
  }
  if (mana > rules.maxMana) {
    flag(`Vượt mana (${mana}/${rules.maxMana})`);
  }
  if (degree > rules.maxDeg) {
    flag(`Bậc quá cao (${degree})`);
  }

  return { ok, reason, mana, degree };
}
