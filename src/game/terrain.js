import { TERRAIN_TYPES } from '../engine/terrain';

// classic — bản đồ mặc định gốc của Phase 9 (v1.2): một của mỗi loại địa hình để chơi/test
// được ngay. Vị trí tính theo tỉ lệ width/height (giống createPlayers) để không vỡ hình trên
// các kích thước màn hình khác nhau.
function createClassicTerrain(width, height) {
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

// open — trống trải, không địa hình nào cả. Dành cho ai muốn tập trung thuần vào hàm số/góc
// bắn, không bị chặn bởi tường/hố/phản xạ/cổng dịch chuyển.
function createOpenTerrain() {
  return [];
}

// gauntlet — nhiều địa hình hơn classic, đặt lệch để tạo hành lang zigzag khó bắn thẳng hơn.
function createGauntletTerrain(width, height) {
  return [
    {
      type: TERRAIN_TYPES.WALL,
      x: width * 0.2 - 5,
      y: height * 0.15,
      w: 10,
      h: height * 0.25,
    },
    {
      type: TERRAIN_TYPES.WALL,
      x: width * 0.8 - 5,
      y: height * 0.55,
      w: 10,
      h: height * 0.25,
    },
    {
      type: TERRAIN_TYPES.REFLECTOR,
      x: width / 2 - 5,
      y: height * 0.42,
      w: 10,
      h: height * 0.12,
      normal: { x: 0, y: -1 },
    },
    {
      type: TERRAIN_TYPES.PIT,
      x: width * 0.35,
      y: height * 0.86,
      w: width * 0.3,
      h: 12,
    },
    {
      type: TERRAIN_TYPES.PORTAL,
      id: 'C',
      pairId: 'gate2',
      x: width * 0.1,
      y: height * 0.72,
      w: 20,
      h: 20,
    },
    {
      type: TERRAIN_TYPES.PORTAL,
      id: 'D',
      pairId: 'gate2',
      x: width * 0.9 - 20,
      y: height * 0.15,
      w: 20,
      h: 20,
    },
  ];
}

// MAP_LIST — danh sách bản đồ cho UI chọn (MapSelect.jsx), giữ thứ tự hiển thị cố định.
export const MAP_LIST = [
  { id: 'classic', label: 'Cổ điển', create: createClassicTerrain },
  { id: 'open', label: 'Trống trải', create: createOpenTerrain },
  { id: 'gauntlet', label: 'Chướng ngại', create: createGauntletTerrain },
];

const MAPS_BY_ID = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));

export const DEFAULT_MAP_ID = MAP_LIST[0].id;

// createTerrain — điểm vào duy nhất để dựng địa hình theo mapId (rơi về bản đồ mặc định
// nếu mapId lạ/không có, vd state cũ trước khi có tính năng chọn bản đồ).
export function createTerrain(mapId, width, height) {
  const map = MAPS_BY_ID[mapId] ?? MAPS_BY_ID[DEFAULT_MAP_ID];
  return map.create(width, height);
}
