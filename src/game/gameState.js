import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS, DEFAULT_MANA, ANGLE_MAX } from '../config';
import { ITEM_TYPES } from '../engine/items';
import { createTerrain } from './terrain';

// Bộ vật phẩm khởi đầu (cơ chế 7, Phase 8) — chưa có cơ chế nhặt/rơi vật phẩm trên bản đồ
// nên mỗi người chơi bắt đầu với đủ một bộ để test/chơi được ngay; thu hẹp lại khi có luật
// phát vật phẩm riêng.
const STARTER_ITEMS = Object.values(ITEM_TYPES);

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
      items: [...STARTER_ITEMS],
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
      items: [...STARTER_ITEMS],
      eliminated: false,
    },
  ];
}

// TURN_PHASE — vòng đời một lượt (spec Phase 6): aiming (đang nhắm/nhập hàm) →
// firing (đạn đang bay, khoá input) → over (đã có người thắng, khoá toàn bộ).
export const TURN_PHASE = { AIMING: 'aiming', FIRING: 'firing', OVER: 'over' };

// shooterDirection — P1 (trái) bắn sang phải (+1), P2 (phải) bắn sang trái (-1) (T4.2).
export function shooterDirection(player) {
  return player.id === 'p1' ? 1 : -1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// createInitialState — trạng thái game đầy đủ dùng cho gameReducer (T6.1). `terrain` khớp
// field cùng tên trong GameState của spec (mục 7) — cố định theo bản đồ mặc định (Phase 9),
// chưa có cơ chế chọn bản đồ nên tạo lại mỗi RESET giống players.
export function createInitialState(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  return {
    players: createPlayers(width, height),
    currentPlayerId: 'p1',
    phase: TURN_PHASE.AIMING,
    winnerId: null,
    terrain: createTerrain(width, height),
  };
}

function alivePlayers(players) {
  return players.filter((p) => !p.eliminated);
}

// nextAlivePlayerId — xoay vòng theo thứ tự trong mảng players, bỏ qua người đã loại
// (T6.1 acceptance: NEXT_TURN xoay vòng qua người chưa loại).
function nextAlivePlayerId(players, currentId) {
  const idx = players.findIndex((p) => p.id === currentId);
  for (let step = 1; step <= players.length; step++) {
    const candidate = players[(idx + step) % players.length];
    if (!candidate.eliminated) return candidate.id;
  }
  return currentId;
}

// gameReducer — FIRE (aiming→firing), ELIMINATE (đánh dấu loại + kiểm tra thắng, T6.3),
// NEXT_TURN (đổi lượt + reset mana người kế tiếp về DEFAULT_MANA, T6.2/T6.5), RESET (T6.6).
export function gameReducer(state, action) {
  switch (action.type) {
    case 'FIRE': {
      if (state.phase !== TURN_PHASE.AIMING) return state;
      return { ...state, phase: TURN_PHASE.FIRING };
    }

    case 'ELIMINATE': {
      const players = state.players.map((p) =>
        p.id === action.playerId ? { ...p, eliminated: true } : p
      );
      const survivors = alivePlayers(players);
      if (survivors.length <= 1) {
        return {
          ...state,
          players,
          phase: TURN_PHASE.OVER,
          winnerId: survivors[0]?.id ?? null,
        };
      }
      return { ...state, players };
    }

    case 'NEXT_TURN': {
      if (state.phase === TURN_PHASE.OVER) return state;
      const nextId = nextAlivePlayerId(state.players, state.currentPlayerId);
      const players = state.players.map((p) =>
        p.id === nextId ? { ...p, mana: DEFAULT_MANA } : p
      );
      return { ...state, players, currentPlayerId: nextId, phase: TURN_PHASE.AIMING };
    }

    case 'SET_ANGLE': {
      if (state.phase !== TURN_PHASE.AIMING) return state;
      const angle = clamp(action.angle, -ANGLE_MAX, ANGLE_MAX);
      const players = state.players.map((p) =>
        p.id === action.playerId ? { ...p, angle } : p
      );
      return { ...state, players };
    }

    // MOVE — di chuyển ≤ MAX_MOVE_CELLS ô theo lưới rời rạc (cơ chế 3, T8.1). dx/dy đã tính
    // sẵn ra pixel bởi UI (hướng * số ô * PIXELS_PER_UNIT); reducer chỉ kẹp trong bounds màn
    // hình (trừ bán kính hitbox để chấm tròn không đi ra ngoài lưới).
    case 'MOVE': {
      if (state.phase !== TURN_PHASE.AIMING) return state;
      const { playerId, dx, dy, bounds } = action;
      const players = state.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          x: clamp(p.x + dx, p.radius, bounds.w - p.radius),
          y: clamp(p.y + dy, p.radius, bounds.h - p.radius),
        };
      });
      return { ...state, players };
    }

    // USE_ITEM — tiêu hao một vật phẩm khỏi túi đồ sau khi hiệu ứng đã áp vào phát bắn (T8.3).
    case 'USE_ITEM': {
      const players = state.players.map((p) =>
        p.id === action.playerId ? { ...p, items: p.items.filter((id) => id !== action.itemId) } : p
      );
      return { ...state, players };
    }

    case 'RESET':
      return createInitialState(action.width, action.height);

    default:
      return state;
  }
}
