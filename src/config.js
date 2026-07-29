export const PIXELS_PER_UNIT = 34;

export const X_MAX = 15;
export const STEP = 0.05;
export const MAX_SLOPE = 40;

export const PLAYER_RADIUS = 18;

export const DEFAULT_MANA = 10;
export const INPUT_TIME_SEC = 10;

// Xoay hệ trục (cơ chế 6, Phase 7) — giới hạn góc bắn để đường cong không quay ngược
// vào chính người bắn; điều chỉnh theo bước ANGLE_STEP mỗi lần bấm +/-.
export const ANGLE_STEP = 5;
export const ANGLE_MAX = 60;
export const AIM_RAY_LENGTH = 60; // px — độ dài tia ngắm mờ hiện trước khi bắn (T7.2)

// Di chuyển (cơ chế 3, Phase 8) — quyết định lưới rời rạc (câu hỏi mở #3 trong spec):
// mỗi "ô" = 1 đơn vị lưới = PIXELS_PER_UNIT, khớp với lưới nền đã vẽ trên canvas nên
// người chơi luôn thấy rõ mình di chuyển đúng bao nhiêu ô, không cần toạ độ liên tục.
export const MAX_MOVE_CELLS = 2;

// AST Guard — cân bằng chống phá game (Phase 3), chỉnh dựa trên playtest.
export const MAX_DEGREE = 3; // bậc đa thức tối đa (mặc định các trận)
export const MAX_AST_NODES = 40; // số node AST tối đa cho một biểu thức
export const MAX_TRIG_COEFF = 12; // |hệ số| tối đa nhân với x trong sin/cos/tan

// Bảng giá mana (spec mục 5.1, X3 — chỉnh dựa trên playtest, không rải rác trong code).
// `pow` có giá riêng theo bậc (POW_COST); bậc không có trong bảng (vd x^9) dùng giá mặc định MANA_COST.pow.
export const MANA_COST = {
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
export const POW_COST = { 2: 3, 3: 5 };

export const CANVAS_WIDTH = 360;
export const CANVAS_HEIGHT = 640;

export const PROJECTILE_POINTS_PER_FRAME = 6; // T5.3 — tốc độ vẽ dần đường cong khi "đạn bay"
