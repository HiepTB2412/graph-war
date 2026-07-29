// moves.js — Multiplayer online (Phase 11, tuỳ chọn). Cốt lõi của spec mục 12: game
// turn-based nên chỉ cần đồng bộ NƯỚC ĐI (một object nhỏ), không cần đồng bộ pixel/animation —
// mỗi máy tự dựng lại kết quả (đường cong, va chạm, trạng thái) từ CÙNG một nước đi vì toàn bộ
// pipeline (sample→rotate→item→terrain→collision, engine/) là hàm thuần/deterministic.
//
// Move dùng field `type` tường minh ('fire' | 'move') thay vì suy luận qua expr/moveTo có mặt
// hay không như câu chữ phác thảo trong spec — rõ ràng hơn khi kiểm tra, không đổi ý nghĩa.
//
// T11.2 acceptance ("tái dựng trạng thái từ nước đi") nằm ở resolveFireMove + applyMove:
// resolveFireMove tính lại đúng đường cong/va chạm; applyMove dispatch lại đúng chuỗi action
// reducer mà máy bắn đã dispatch cục bộ. Hai máy cùng nhận một move, cùng state trước đó →
// cùng state sau đó, không cần gửi curvesPts hay bất kỳ dữ liệu dẫn xuất nào khác.
import { compileFunction } from '../engine/astGuard';
import { sampleCurve } from '../engine/curve';
import { checkCollision } from '../engine/collision';
import { rotate } from '../engine/transforms';
import { applyItemToPoints, applyItemToSampleOptions, ITEM_TYPES, mirrorFn } from '../engine/items';
import { applyTerrain } from '../engine/terrain';
import { PIXELS_PER_UNIT, X_MAX, STEP, MAX_SLOPE } from '../config';
import { gameReducer, shooterDirection } from './gameState';

// bounds = {w,h} màn hình của máy TẠO nước đi, gắn kèm trong move. resolveFireMove PHẢI dùng
// đúng bounds này (không dùng kích thước màn hình cục bộ của máy nhận) — sampleCurve cắt đường
// cong khi ra ngoài bounds, nên hai máy khác kích thước màn hình mà dùng bounds khác nhau sẽ
// cắt đường cong ở chỗ khác nhau, phá vỡ tính "cùng move → cùng kết quả" mà toàn bộ thiết kế
// đồng bộ này dựa vào. Vì cùng lý do, MOVE cũng gắn kèm bounds của máy tạo nước đi.
export function createFireMove({ playerId, expr, angle, itemId = null, bounds }) {
  return { type: 'fire', playerId, expr, angle, itemId, bounds };
}

// Hạn chế đã biết: hai máy màn hình khác kích thước sẽ kẹp vị trí (MOVE) khác nhau một chút vì
// PLAYER_RADIUS cố định nhưng biên kẹp theo bounds — chấp nhận được ở mức hot-seat/bạn bè.
export function createMoveMove({ playerId, dx, dy, bounds }) {
  return { type: 'move', playerId, moveTo: { dx, dy }, bounds };
}

// resolveFireMove — tính lại đường cong (hoặc hai đường nếu vật phẩm "double") + kết quả va
// chạm từ move.expr/move.angle/move.itemId/move.bounds và state hiện tại (players/terrain) —
// ĐÚNG pipeline GameScreen dùng khi bắn cục bộ (sample → rotate → item → terrain → collision),
// tách ra đây để dùng chung cho cả bắn cục bộ lẫn dựng lại từ nước đi nhận qua mạng.
export function resolveFireMove(state, move) {
  const shooter = state.players.find((p) => p.id === move.playerId);
  const fn = compileFunction(move.expr);
  const origin = { x: shooter.x, y: shooter.y };
  const angle = move.angle ?? shooter.angle;
  const itemId = move.itemId ?? null;
  const bounds = move.bounds;

  const baseDirection = shooterDirection(shooter);
  const { direction, xMax } = itemId
    ? applyItemToSampleOptions(itemId, baseDirection, X_MAX)
    : { direction: baseDirection, xMax: X_MAX };
  const sampleOpts = {
    pixelsPerUnit: PIXELS_PER_UNIT,
    direction,
    xMax,
    step: STEP,
    bounds,
    maxSlope: MAX_SLOPE,
  };

  let pts = rotate(sampleCurve(fn, origin, sampleOpts), origin, angle);
  pts = itemId ? applyItemToPoints(itemId, pts, origin) : pts;
  pts = applyTerrain(pts, state.terrain);

  const curvesPts = [pts];
  if (itemId === ITEM_TYPES.DOUBLE) {
    const secondary = rotate(sampleCurve(mirrorFn(fn), origin, sampleOpts), origin, angle);
    curvesPts.push(applyTerrain(secondary, state.terrain));
  }

  const best = curvesPts.reduce((acc, curvePts) => {
    const hit = checkCollision(curvePts, state.players, shooter.id);
    if (!hit) return acc;
    const idx = curvePts.indexOf(hit.at);
    return !acc || idx < acc.idx ? { hitId: hit.hitId, idx } : acc;
  }, null);

  return { curvesPts, hit: best };
}

// applyMove — dựng lại state SAU nước đi bằng đúng chuỗi action mà máy bắn/di chuyển cục bộ
// đã dispatch (không animate — dùng cho máy nhận nước đi qua mạng, hoặc test, hoặc bất kỳ nơi
// nào chỉ cần state cuối cùng chứ không cần hiệu ứng đạn bay).
// `resolved` = kết quả resolveFireMove (bắt buộc với move 'fire', bỏ qua với move 'move').
export function applyMove(state, move, resolved) {
  if (move.type === 'move') {
    const moved = gameReducer(state, {
      type: 'MOVE',
      playerId: move.playerId,
      dx: move.moveTo.dx,
      dy: move.moveTo.dy,
      bounds: move.bounds,
    });
    return gameReducer(moved, { type: 'NEXT_TURN' });
  }

  if (move.type === 'fire') {
    let next = gameReducer(state, { type: 'FIRE' });
    if (resolved?.hit) {
      next = gameReducer(next, { type: 'ELIMINATE', playerId: resolved.hit.hitId });
    }
    if (move.itemId) {
      next = gameReducer(next, { type: 'USE_ITEM', playerId: move.playerId, itemId: move.itemId });
    }
    return gameReducer(next, { type: 'NEXT_TURN' });
  }

  return state;
}
