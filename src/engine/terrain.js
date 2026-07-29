// terrain.js — địa hình (cơ chế 4, Phase 9, spec mục 13 câu hỏi mở #2). Spec chỉ khai báo
// `terrain: Terrain[]` trong GameState mà không định nghĩa hình dạng cụ thể, nên thiết kế
// tối thiểu ở đây: mỗi terrain là một hình chữ nhật (x, y, w, h theo pixel màn hình, CÙNG hệ
// toạ độ với điểm đường cong sau khi đã sample → rotate → item — spec mục 6 liệt kê thứ tự
// pipeline 6.1→6.2→6.3→6.4, terrain là bước cuối trước va chạm).
//
// Chốt câu hỏi mở #2: PHẢN XẠ THEO PHÁP TUYẾN MẶT PHẲNG (không chỉ chặn), vì T9.3 yêu cầu
// rõ "tính pháp tuyến mặt, đổi hướng phần đường cong còn lại" — nếu chỉ chặn thì không còn
// gì để tính pháp tuyến. Tường/hố vẫn dùng cách chặn đơn giản (T9.2) vì bản chất khác nhau:
// chúng không có hướng phản xạ, chỉ có "chạm là dừng".
export const TERRAIN_TYPES = {
  WALL: 'wall', // chặn cứng — dừng đường cong (T9.2)
  PIT: 'pit', // hố — dừng đường cong như tường (T9.2), khác nhau về ý nghĩa/hiển thị
  REFLECTOR: 'reflector', // khối phản xạ — cần thêm field `normal: {x,y}` (T9.3)
  PORTAL: 'portal', // cổng dịch chuyển — cần thêm field `pairId` để ghép đôi A/B (T9.4)
};

export function pointInRect(p, rect) {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
}

// findTerrainHit — trả về terrain đầu tiên trong danh sách chứa điểm p (ưu tiên theo thứ tự
// khai báo, giống checkCollision ưu tiên theo thứ tự players).
export function findTerrainHit(p, terrain) {
  for (const t of terrain) {
    if (pointInRect(p, t)) return t;
  }
  return null;
}

// reflectPoints — lật từng điểm qua đường thẳng đi qua `pivot`, vuông góc với `normal`
// (pháp tuyến mặt phản xạ). Đây chính là phép "đổi hướng phần đường cong còn lại" (T9.3):
// điểm càng xa mặt phẳng theo hướng pháp tuyến thì bị đẩy ngược lại càng xa.
export function reflectPoints(pts, pivot, normal) {
  const len = Math.hypot(normal.x, normal.y) || 1;
  const n = { x: normal.x / len, y: normal.y / len };
  return pts.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    const dot = dx * n.x + dy * n.y;
    return { x: p.x - 2 * dot * n.x, y: p.y - 2 * dot * n.y };
  });
}

// findPortalPair — cổng B tương ứng với cổng A (cùng pairId, khác id) — hai chiều: chạm cổng
// nào cũng dịch chuyển sang cổng còn lại (T9.4).
export function findPortalPair(terrain, portal) {
  return terrain.find(
    (t) => t.type === TERRAIN_TYPES.PORTAL && t.pairId === portal.pairId && t.id !== portal.id
  );
}

function rectCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

// applyTerrain — quét pts theo thứ tự vẽ, áp dụng terrain đầu tiên chạm phải:
//   - wall/pit  → cắt đường cong tại điểm chạm (T9.2)
//   - reflector → cắt tới điểm chạm rồi PHẢN XẠ phần còn lại quanh pháp tuyến (T9.3)
//   - portal    → cắt tới điểm chạm rồi dịch chuyển phần còn lại sang cổng ghép đôi (T9.4)
// Sau phản xạ/dịch chuyển, quét lại đoạn vừa biến đổi để bắt chuỗi va chạm liên tiếp
// (dội tường nhiều lần, hoặc dịch chuyển liên hoàn) — giới hạn `maxBounces` để không lặp vô hạn
// nếu terrain đặt sai (vd phản xạ vào chính nó).
export function applyTerrain(pts, terrain, { maxBounces = 8 } = {}) {
  if (!terrain || terrain.length === 0) return pts;

  let result = pts;
  // searchFrom — quét tiếp từ NGAY SAU điểm chạm lần trước, không quét lại từ đầu mảng.
  // Nếu quét lại từ 0 mỗi vòng, điểm chạm cũ (vẫn nằm trong terrain đó) sẽ bị phát hiện lại
  // và bị phản xạ/dịch chuyển chồng thêm lần nữa mỗi vòng lặp — sai với ý định "chỉ xử lý
  // phần đường cong CÒN LẠI" của T9.3/T9.4.
  let searchFrom = 0;
  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    let hitIndex = -1;
    let hit = null;
    for (let i = searchFrom; i < result.length; i++) {
      const t = findTerrainHit(result[i], terrain);
      if (t) {
        hitIndex = i;
        hit = t;
        break;
      }
    }
    if (!hit) return result;

    const head = result.slice(0, hitIndex + 1);
    const contact = result[hitIndex];

    if (hit.type === TERRAIN_TYPES.WALL || hit.type === TERRAIN_TYPES.PIT) {
      return head;
    }

    if (hit.type === TERRAIN_TYPES.REFLECTOR) {
      const tail = reflectPoints(result.slice(hitIndex + 1), contact, hit.normal);
      result = [...head, ...tail];
      searchFrom = hitIndex + 1;
      continue;
    }

    if (hit.type === TERRAIN_TYPES.PORTAL) {
      const exit = findPortalPair(terrain, hit);
      if (!exit) return head; // cổng lẻ, không có cặp → coi như tường
      const exitCenter = rectCenter(exit);
      const offset = { x: exitCenter.x - contact.x, y: exitCenter.y - contact.y };
      const tail = result.slice(hitIndex + 1).map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }));
      result = [...head, ...tail];
      searchFrom = hitIndex + 1;
      continue;
    }

    return result;
  }
  return result;
}
