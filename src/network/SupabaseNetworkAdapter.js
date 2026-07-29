import { createClient } from '@supabase/supabase-js';

// SupabaseNetworkAdapter.js — triển khai NetworkAdapter.js (T11.1) bằng Supabase Realtime
// "Broadcast": kênh pub/sub thuần tuý, không cần bảng/schema, không cần bật Realtime
// Authorization (chỉ cần khi broadcast TỪ database qua realtime.send(), không áp dụng ở đây) —
// đúng tinh thần spec mục 12 "không cần server real-time phức tạp".
//
// Cần biến môi trường (đọc từ https://docs.expo.dev/guides/environment-variables/, EXPO_PUBLIC_*
// tự inline vào bundle client, KHÔNG dùng cho secret thật — nhưng anon key của Supabase vốn
// thiết kế để lộ ra client, bảo vệ bằng Row Level Security chứ không phải giữ bí mật):
//   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon/public key>
// Đặt trong file `.env` ở gốc dự án (xem `.env.example`). Chưa có → createSupabaseNetworkAdapter
// ném lỗi rõ ràng ngay khi gọi, không âm thầm không kết nối được.
const MOVE_EVENT = 'move';

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// createSupabaseNetworkAdapter — triển khai đúng giao diện trong NetworkAdapter.js.
// `config` cho phép truyền url/anonKey trực tiếp (test, hoặc nhiều project) thay vì luôn đọc
// biến môi trường — mặc định đọc EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY.
// `client` (tuỳ chọn) để tiêm sẵn một Supabase client giả lập khi test, khỏi phải mock module.
export function createSupabaseNetworkAdapter(config = {}) {
  const url = config.url ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = config.anonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!config.client && (!url || !anonKey)) {
    throw new Error(
      'Thiếu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — tạo file .env từ .env.example ' +
        'với thông tin project Supabase của bạn (Project Settings → API).'
    );
  }

  const client = config.client ?? createClient(url, anonKey);
  const rooms = new Map(); // roomId -> { channel, listeners: Set<fn>, subscribed: boolean }

  // getOrCreateRoom — đăng ký ĐÚNG MỘT lần listener 'broadcast' trên channel Supabase khi tạo
  // (trước subscribe), rồi tự phân phối lại cho các callback cục bộ trong `listeners` — tránh
  // vấn đề thêm .on() sau khi channel đã subscribe (không đảm bảo Supabase áp dụng kịp).
  function getOrCreateRoom(roomId) {
    let room = rooms.get(roomId);
    if (room) return room;

    const listeners = new Set();
    const channel = client.channel(`graph-war-${roomId}`);
    channel.on('broadcast', { event: MOVE_EVENT }, ({ payload }) => {
      listeners.forEach((callback) => callback(payload));
    });

    room = { channel, listeners, subscribed: false };
    rooms.set(roomId, room);
    return room;
  }

  function ensureSubscribed(room) {
    if (room.subscribed) return;
    room.subscribed = true;
    room.channel.subscribe();
  }

  return {
    async createRoom() {
      const roomId = randomRoomId();
      ensureSubscribed(getOrCreateRoom(roomId));
      return roomId;
    },

    async joinRoom(roomId) {
      ensureSubscribed(getOrCreateRoom(roomId));
    },

    async sendMove(roomId, move) {
      const room = getOrCreateRoom(roomId);
      ensureSubscribed(room);
      await room.channel.send({ type: 'broadcast', event: MOVE_EVENT, payload: move });
    },

    onMove(roomId, callback) {
      const room = getOrCreateRoom(roomId);
      ensureSubscribed(room);
      room.listeners.add(callback);
      return () => room.listeners.delete(callback);
    },
  };
}
