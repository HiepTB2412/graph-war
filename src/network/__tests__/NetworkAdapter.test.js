import { createLocalLoopbackAdapter } from '../NetworkAdapter';

describe('createLocalLoopbackAdapter', () => {
  it('createRoom trả về roomId khác nhau mỗi lần', async () => {
    const adapter = createLocalLoopbackAdapter();
    const roomA = await adapter.createRoom();
    const roomB = await adapter.createRoom();
    expect(roomA).not.toBe(roomB);
  });

  it('sendMove phát tới đúng listener đã onMove trong cùng phòng', async () => {
    const adapter = createLocalLoopbackAdapter();
    const roomId = await adapter.createRoom();
    const received = [];
    adapter.onMove(roomId, (move) => received.push(move));

    const move = { type: 'fire', playerId: 'p1', expr: 'x^2', angle: 0 };
    await adapter.sendMove(roomId, move);

    expect(received).toEqual([move]);
  });

  it('joinRoom cho phép người thứ hai nhận move gửi trong phòng đó', async () => {
    const adapter = createLocalLoopbackAdapter();
    const roomId = await adapter.createRoom();
    await adapter.joinRoom(roomId);

    const received = [];
    adapter.onMove(roomId, (move) => received.push(move));
    await adapter.sendMove(roomId, { type: 'move', playerId: 'p2', moveTo: { dx: 34, dy: 0 } });

    expect(received).toHaveLength(1);
  });

  it('unsubscribe (giá trị trả về của onMove) ngăn nhận move sau đó', async () => {
    const adapter = createLocalLoopbackAdapter();
    const roomId = await adapter.createRoom();
    const received = [];
    const unsubscribe = adapter.onMove(roomId, (move) => received.push(move));

    unsubscribe();
    await adapter.sendMove(roomId, { type: 'fire', playerId: 'p1', expr: 'x' });

    expect(received).toEqual([]);
  });

  it('sendMove tới phòng không tồn tại → không lỗi, không làm gì', async () => {
    const adapter = createLocalLoopbackAdapter();
    await expect(adapter.sendMove('phòng-không-có-thật', { type: 'fire' })).resolves.toBeUndefined();
  });

  it('nhiều listener trong cùng phòng đều nhận được move', async () => {
    const adapter = createLocalLoopbackAdapter();
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
