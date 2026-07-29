import { TERRAIN_TYPES } from '../engine/terrain';

// createTerrain — bản đồ mặc định cho Phase 9 (v1.2): một của mỗi loại địa hình để chơi/test
// được ngay (spec chưa có level editor/nhiều bản đồ). Vị trí tính theo tỉ lệ width/height
// (giống createPlayers) để không vỡ hình trên các kích thước màn hình khác nhau.
export function createTerrain(width, height) {
  return [
    // Tường chắn giữa màn hình, chặn các phát bắn đi thẳng qua tâm (T9.2).
    {
      type: TERRAIN_TYPES.WALL,
      x: width / 2 - 5,
      y: height * 0.12,
      w: 10,
      h: height * 0.18,
    },
    // Hố ở gần đáy — cùng hành vi chặn như tường nhưng khác ý nghĩa/hiển thị (T9.2).
    {
      type: TERRAIN_TYPES.PIT,
      x: width * 0.4,
      y: height * 0.88,
      w: width * 0.2,
      h: 12,
    },
    // Khối phản xạ đứng, pháp tuyến hướng sang phải — bật ngược các phát bắn từ bên trái (T9.3).
    {
      type: TERRAIN_TYPES.REFLECTOR,
      x: width * 0.25,
      y: height * 0.55,
      w: 10,
      h: height * 0.15,
      normal: { x: 1, y: 0 },
    },
    // Cặp cổng dịch chuyển hai chiều, đặt ở hai bên màn hình (T9.4).
    {
      type: TERRAIN_TYPES.PORTAL,
      id: 'A',
      pairId: 'gate1',
      x: width * 0.08,
      y: height * 0.25,
      w: 20,
      h: 20,
    },
    {
      type: TERRAIN_TYPES.PORTAL,
      id: 'B',
      pairId: 'gate1',
      x: width * 0.92 - 20,
      y: height * 0.25,
      w: 20,
      h: 20,
    },
  ];
}
