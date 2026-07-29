// collision.js — va chạm dọc đường cong với người chơi (spec mục 6.4, T5.1).
// Duyệt từng điểm pixel của đường cong theo thứ tự vẽ; điểm đầu tiên rơi vào bán kính
// của một người chơi còn sống (không phải người bắn) → trả về hitId + toạ độ trúng.
// Bỏ qua người bắn (shooterId) và người đã eliminated để không tự trúng đạn của mình
// hoặc trúng người đã loại.
export function checkCollision(pts, players, shooterId) {
  for (const p of pts) {
    for (const pl of players) {
      if (pl.id === shooterId || pl.eliminated) continue;
      const dx = p.x - pl.x, dy = p.y - pl.y;
      if (dx * dx + dy * dy <= pl.radius * pl.radius) return { hitId: pl.id, at: p };
    }
  }
  return null;
}
