import { DEFAULT_MANA, MAX_AST_NODES, MAX_DEGREE, MAX_TRIG_COEFF } from '../config';

// rules.js — cấu hình các trận (MatchRules) nạp vào astGuard.analyze().
// Đổi rule ở đây để thay đổi hành vi kiểm tra, không sửa engine (spec mục 5.4).

// Trận 1: chỉ đa thức — không cho bất kỳ hàm nào (sin/cos/sqrt/log/abs), chỉ +,-,*,^.
export const polynomialOnly = {
  name: 'Chỉ đa thức',
  allowedFns: new Set(),
  maxMana: DEFAULT_MANA,
  maxDeg: MAX_DEGREE,
  maxNodes: MAX_AST_NODES,
  maxTrigCoeff: MAX_TRIG_COEFF,
  requireParen: false,
  banPow2: false,
};

// Trận 2: chỉ sin, cos — không cho pow (đa thức không thuộc dạng sóng).
export const trigOnly = {
  name: 'Chỉ sin/cos',
  allowedFns: new Set(['sin', 'cos']),
  maxMana: DEFAULT_MANA,
  maxDeg: 1,
  maxNodes: MAX_AST_NODES,
  maxTrigCoeff: MAX_TRIG_COEFF,
  requireParen: false,
  banPow2: false,
};

// Trận 3: cấm x^2 — vẫn cho các hàm trong whitelist (5.2), chỉ chặn riêng bậc 2.
export const noSquare = {
  name: 'Cấm x^2',
  allowedFns: new Set(['sin', 'cos', 'sqrt', 'abs', 'log']),
  maxMana: DEFAULT_MANA,
  maxDeg: MAX_DEGREE,
  maxNodes: MAX_AST_NODES,
  maxTrigCoeff: MAX_TRIG_COEFF,
  requireParen: false,
  banPow2: true,
};

// Trận 4: bắt buộc có ít nhất một dấu ngoặc.
export const requireParenMatch = {
  name: 'Bắt buộc có ngoặc',
  allowedFns: new Set(['sin', 'cos', 'sqrt', 'abs', 'log']),
  maxMana: DEFAULT_MANA,
  maxDeg: MAX_DEGREE,
  maxNodes: MAX_AST_NODES,
  maxTrigCoeff: MAX_TRIG_COEFF,
  requireParen: true,
  banPow2: false,
};

// Trận hỗn loạn — nới hết mọi giới hạn (mana, node, hệ số trig) để test/chơi tự do,
// vẫn giữ whitelist hàm và cấm chia (chống phá game luôn áp dụng, không tuỳ trận).
export const chaos = {
  name: 'Hỗn loạn',
  allowedFns: new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log']),
  maxMana: DEFAULT_MANA * 2,
  maxDeg: MAX_DEGREE,
  maxNodes: MAX_AST_NODES * 2,
  maxTrigCoeff: MAX_TRIG_COEFF * 2,
  requireParen: false,
  banPow2: false,
};

export const ALL_RULES = { polynomialOnly, trigOnly, noSquare, requireParenMatch, chaos };
