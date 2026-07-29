import { createSupabaseNetworkAdapter } from '../SupabaseNetworkAdapter';

// Client Supabase giả lập tối thiểu — mô phỏng đúng shape API thật (channel/.on/.subscribe/.send)
// đủ để test logic của adapter (đăng ký/huỷ đăng ký, tái sử dụng channel theo tên) mà không cần
// một project Supabase thật. `channel(name)` trả về CÙNG object nếu gọi lại cùng tên — giống
// hành vi thật khi nhiều adapter (nhiều "máy") cùng kết nối một project và join cùng channel.
function createFakeSupabaseClient() {
  const channels = new Map();
  return {
    channel(name) {
      if (channels.has(name)) return channels.get(name);
      const bindings = [];
      const fake = {
        on(type, filter, cb) {
          if (type === 'broadcast') bindings.push({ event: filter.event, cb });
          return fake;
        },
        subscribe(statusCb) {
          if (statusCb) statusCb('SUBSCRIBED');
          return fake;
        },
        async send({ type, event, payload }) {
          if (type !== 'broadcast') return;
          bindings.filter((b) => b.event === event).forEach((b) => b.cb({ payload }));
        },
      };
      channels.set(name, fake);
      return fake;
    },
  };
}

describe('createSupabaseNetworkAdapter', () => {
  it('thiếu cả url/anonKey lẫn client tiêm sẵn → ném lỗi rõ ràng', () => {
    const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => createSupabaseNetworkAdapter()).toThrow(/EXPO_PUBLIC_SUPABASE/);

    if (originalUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  it('createRoom trả về roomId khác nhau mỗi lần', async () => {
    const adapter = createSupabaseNetworkAdapter({ client: createFakeSupabaseClient() });
    const roomA = await adapter.createRoom();
    const roomB = await adapter.createRoom();
    expect(roomA).not.toBe(roomB);
  });

  it('sendMove phát tới listener đã onMove trong cùng phòng (cùng client)', async () => {
    const adapter = createSupabaseNetworkAdapter({ client: createFakeSupabaseClient() });
    const roomId = await adapter.createRoom();
    const received = [];
    adapter.onMove(roomId, (move) => received.push(move));

    const move = { type: 'fire', playerId: 'p1', expr: 'x^2', angle: 0 };
    await adapter.sendMove(roomId, move);

    expect(received).toEqual([move]);
  });

  it('hai adapter khác nhau dùng CHUNG client (mô phỏng hai máy) → thấy move của nhau', async () => {
    const sharedClient = createFakeSupabaseClient();
    const deviceA = createSupabaseNetworkAdapter({ client: sharedClient });
    const deviceB = createSupabaseNetworkAdapter({ client: sharedClient });

    const roomId = await deviceA.createRoom();
    await deviceB.joinRoom(roomId);

    const receivedByB = [];
    deviceB.onMove(roomId, (move) => receivedByB.push(move));

    const move = { type: 'move', playerId: 'p1', moveTo: { dx: 34, dy: 0 } };
    await deviceA.sendMove(roomId, move);

    expect(receivedByB).toEqual([move]);
  });

  it('unsubscribe (giá trị trả về của onMove) ngăn nhận move sau đó', async () => {
    const adapter = createSupabaseNetworkAdapter({ client: createFakeSupabaseClient() });
    const roomId = await adapter.createRoom();
    const received = [];
    const unsubscribe = adapter.onMove(roomId, (move) => received.push(move));

    unsubscribe();
    await adapter.sendMove(roomId, { type: 'fire', playerId: 'p1', expr: 'x' });

    expect(received).toEqual([]);
  });

  it('nhiều listener trong cùng phòng đều nhận được move', async () => {
    const adapter = createSupabaseNetworkAdapter({ client: createFakeSupabaseClient() });
    const roomId = await adapter.createRoom();
    const a = [];
    const b = [];
    adapter.onMove(roomId, (move) => a.push(move));
    adapter.onMove(roomId, (move) => b.push(move));

    const move = { type: 'fire', playerId: 'p1', expr: 'sin(x)' };
    await adapter.sendMove(roomId, move);

    expect(a).toEqual([move]);
    expect(b).toEqual([move]);
  });
});
