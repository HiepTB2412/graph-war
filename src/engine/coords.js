// coords.js — quy đổi toạ độ toán học (đơn vị) sang toạ độ pixel màn hình.
// origin = điểm gốc trên màn hình (pixel); direction = +1 (phải, mặc định) / -1 (lật trái).
// Trục y màn hình đi xuống nên phải đảo dấu: y_screen = origin.y - uy * pixelsPerUnit.
export function toScreen(origin, ux, uy, { pixelsPerUnit, direction = 1 } = {}) {
  return {
    x: origin.x + direction * ux * pixelsPerUnit,
    y: origin.y - uy * pixelsPerUnit,
  };
}
