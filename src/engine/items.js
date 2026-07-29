// items.js — vật phẩm (cơ chế 7, spec mục 6.3). Hầu hết chỉ là biến đổi rẻ trên chính
// point pipeline: một số đổi THAM SỐ đầu vào của sampleCurve (mirror, rangeUp — phải áp
// trước khi sample), số còn lại LẬT MẢNG ĐIỂM đã sinh quanh origin (flipX, flipY — áp sau
// rotate, đúng thứ tự pipeline 6.1 → 6.2 → 6.3 → 6.4 trong spec). `double` không nằm gọn
// trong hai hàm dưới vì nó sinh thêm một đường cong thứ hai (-f(x)) — GameScreen tự sample
// lần nữa bằng `mirrorFn(fn)` và vẽ song song.
export const ITEM_TYPES = {
  MIRROR: 'mirror', // phản chiếu: đổi hướng bắn (direction *= -1)
  FLIP_Y: 'flipY', // đảo trục Y: lật đường cong qua trục ngang tại origin
  FLIP_X: 'flipX', // đảo trục X: lật đường cong qua trục dọc tại origin
  DOUBLE: 'double', // nhân đôi đồ thị: vẽ thêm bản -f(x)
  RANGE_UP: 'rangeUp', // tăng phạm vi: tăng xMax
};

export const ITEM_LABELS = {
  [ITEM_TYPES.MIRROR]: 'Phản chiếu',
  [ITEM_TYPES.FLIP_Y]: 'Đảo trục Y',
  [ITEM_TYPES.FLIP_X]: 'Đảo trục X',
  [ITEM_TYPES.DOUBLE]: 'Nhân đôi',
  [ITEM_TYPES.RANGE_UP]: 'Tăng phạm vi',
};

// applyItemToSampleOptions — vật phẩm ảnh hưởng THAM SỐ đầu vào của sampleCurve.
export function applyItemToSampleOptions(itemType, direction, xMax) {
  switch (itemType) {
    case ITEM_TYPES.MIRROR:
      return { direction: direction * -1, xMax };
    case ITEM_TYPES.RANGE_UP:
      return { direction, xMax: xMax * 2 };
    default:
      return { direction, xMax };
  }
}

// applyItemToPoints — vật phẩm lật MẢNG ĐIỂM đã sample (và đã xoay góc) quanh origin.
export function applyItemToPoints(itemType, pts, origin) {
  switch (itemType) {
    case ITEM_TYPES.FLIP_Y:
      return pts.map((p) => ({ x: p.x, y: origin.y - (p.y - origin.y) }));
    case ITEM_TYPES.FLIP_X:
      return pts.map((p) => ({ x: origin.x - (p.x - origin.x), y: p.y }));
    default:
      return pts;
  }
}

// mirrorFn — dùng cho vật phẩm "nhân đôi đồ thị": sample thêm một bản -f(x) song song bản gốc.
export function mirrorFn(fn) {
  return (x) => -fn(x);
}
