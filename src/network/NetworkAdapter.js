// NetworkAdapter.js — Multiplayer online (T11.1, tuỳ chọn). Spec mục 12 chỉ yêu cầu đồng bộ
// NƯỚC ĐI (game/moves.js), không cần server real-time phức tạp — nên giao logic mạng qua một
// giao diện nhỏ, tách biệt hẳn khỏi backend cụ thể (Firestore hay Supabase Realtime). Đổi
// backend sau này chỉ cần viết một adapter khác cùng giao diện, không đụng game logic/UI.
//
// Một adapter hợp lệ phải cung cấp:
//   createRoom(): Promise<string>          — tạo phòng mới, trả về roomId để chia sẻ cho người chơi kia
//   joinRoom(roomId): Promise<void>        — tham gia phòng đã có
//   sendMove(roomId, move): Promise<void>  — gửi một nước đi (shape: xem game/moves.js)
//   onMove(roomId, callback): () => void   — đăng ký nhận nước đi từ đối thủ; gọi lại giá trị
//                                             trả về để huỷ đăng ký (giống unsubscribe)
//
// GameScreen (khi nối mạng thật) sẽ: gọi sendMove() ngay sau khi tạo move cục bộ, và gọi
// applyMove(state, move, resolved) trong callback của onMove() để dựng lại nước đi của đối thủ.
//
// createLocalLoopbackAdapter — triển khai ĐÚNG giao diện trên bằng bộ nhớ trong (không qua
// mạng thật). Dùng để test giao diện adapter, hoặc làm nền cho chế độ hot-seat/offline sau này
// nếu muốn tái dùng cùng pipeline gửi/nhận move thay vì dispatch thẳng như GameScreen hiện tại.
export function createLocalLoopbackAdapter() {
  const rooms = new Map(); // roomId -> Set<callback>
  let nextId = 1;

  return {
    async createRoom() {
      const roomId = `room-${nextId++}`;
      rooms.set(roomId, new Set());
      return roomId;
    },

    async joinRoom(roomId) {
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    },

    async sendMove(roomId, move) {
      const listeners = rooms.get(roomId);
      if (!listeners) return;
      listeners.forEach((callback) => callback(move));
    },

    onMove(roomId, callback) {
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      const listeners = rooms.get(roomId);
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
