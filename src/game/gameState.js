import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, DEFAULT_MANA } from '../config';

// createPlayers — trạng thái người chơi ban đầu (spec mục 7, type Player):
// P1 đứng bên trái, P2 đứng bên phải, cùng chiều cao giữa màn hình.
// Reducer đầy đủ (FIRE/NEXT_TURN/ELIMINATE/RESET) sẽ thêm ở Phase 6, dùng lại shape này.
export function createPlayers(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  const y = height / 2;
  const margin = width * 0.15;
  return [
    {
      id: 'p1',
      label: 'P1',
      x: margin,
      y,
      radius: PLAYER_RADIUS,
      color: '#4dd0e1',
      angle: 0,
      mana: DEFAULT_MANA,
      items: [],
      eliminated: false,
    },
    {
      id: 'p2',
      label: 'P2',
      x: width - margin,
      y,
      radius: PLAYER_RADIUS,
      color: '#ff8a65',
      angle: 0,
      mana: DEFAULT_MANA,
      items: [],
      eliminated: false,
    },
  ];
}
