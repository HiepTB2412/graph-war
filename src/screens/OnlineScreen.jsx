import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameCanvas from '../components/GameCanvas';
import EquationInput from '../components/EquationInput';
import TurnBar from '../components/TurnBar';
import AngleControl from '../components/AngleControl';
import MoveControl from '../components/MoveControl';
import ItemBag from '../components/ItemBag';
import { analyze } from '../engine/astGuard';
import { classifyAnalysis } from '../engine/classify';
import { toPathD } from '../engine/curve';
import { rotate } from '../engine/transforms';
import {
  PIXELS_PER_UNIT,
  PROJECTILE_POINTS_PER_FRAME,
  INPUT_TIME_SEC,
  ANGLE_STEP,
  AIM_RAY_LENGTH,
  MAX_MOVE_CELLS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../config';
import { chaos as activeRules } from '../game/rules';
import { createInitialState, gameReducer, shooterDirection, TURN_PHASE } from '../game/gameState';
import { createFireMove, createMoveMove, resolveFireMove } from '../game/moves';
import { createSupabaseNetworkAdapter } from '../network/SupabaseNetworkAdapter';

// OnlineScreen — Multiplayer online (Phase 11, tuỳ chọn, T11.1-T11.2). Người tạo phòng luôn là
// p1, người vào sau luôn là p2 (đơn giản hoá, không cần chọn phe). Chỉ gửi/nhận NƯỚC ĐI qua
// SupabaseNetworkAdapter (Realtime Broadcast) — không đồng bộ pixel/animation; mỗi máy tự dựng
// lại đường cong + va chạm bằng resolveFireMove (game/moves.js), NÊN CẢ HAI MÁY PHẢI DÙNG CHUNG
// state trước đó + cùng move mới ra cùng kết quả (đã test ở game/__tests__/moves.test.js).
//
// Chống mất nước đi đầu: p1 (chủ phòng) bị khoá thao tác cho tới khi nhận được tín hiệu 'join'
// từ p2 — vì Realtime Broadcast không lưu lịch sử, move gửi trước khi p2 subscribe sẽ mất.
export default function OnlineScreen() {
  // width/height = kích thước THẬT màn hình máy này, chỉ dùng để HIỂN THỊ (GameCanvas
  // renderWidth/renderHeight) — mọi tính toán vật lý/state dùng CANVAS_WIDTH/HEIGHT cố định
  // bên dưới. Hai máy màn hình khác kích thước mà lỡ dùng width/height thật cho state (như
  // trước khi sửa) sẽ có vị trí người chơi/địa hình khác nhau ngay từ đầu ván — cùng một
  // nước đi (cùng expr/góc) ra kết quả va chạm khác nhau giữa hai máy dù resolveFireMove vẫn
  // chạy đúng cùng một logic (bug đã gặp khi test 2 máy thật, không phải lỗi race-condition).
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [connectError, setConnectError] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  // rematchStatus — 'idle' | 'requested' (mình vừa mời, chờ đối thủ) | 'invited' (đối thủ vừa
  // mời, chờ mình xác nhận). Chỉ là tín hiệu UI cục bộ, không phải một 'move' theo nghĩa
  // game/moves.js (không cần resolveFireMove/applyMove) — gửi thẳng qua adapter như 'join'.
  const [rematchStatus, setRematchStatus] = useState('idle');

  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(CANVAS_WIDTH, CANVAS_HEIGHT)
  );
  const [curveData, setCurveData] = useState(null);
  const [error, setError] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [caption, setCaption] = useState(null);
  const animationRef = useRef(null);
  const adapterRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(
    () => () => {
      cancelAnimationFrame(animationRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
    },
    []
  );
  useEffect(() => setActiveItemId(null), [state.currentPlayerId]);

  const gridOrigin = useMemo(() => ({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }), []);
  const { players, currentPlayerId, phase, winnerId } = state;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const winner = players.find((p) => p.id === winnerId);
  const myTurn = phase === TURN_PHASE.AIMING && currentPlayerId === myPlayerId;

  function getAdapter() {
    if (!adapterRef.current) adapterRef.current = createSupabaseNetworkAdapter();
    return adapterRef.current;
  }

  // playFireMove — dùng chung cho cả nước đi CỦA MÌNH (bắn xong gọi luôn) lẫn nước đi CỦA ĐỐI
  // THỦ (nhận qua onMove) — cùng một hàm resolveFireMove nên hai máy ra cùng kết quả (T11.2).
  function playFireMove(move) {
    const shooter = players.find((p) => p.id === move.playerId);
    const { curvesPts, hit } = resolveFireMove(state, move);

    setCaption(`Đây là ${classifyAnalysis(analyze(move.expr, activeRules))}`);
    cancelAnimationFrame(animationRef.current);
    dispatch({ type: 'FIRE' });

    const stopIndex = hit ? hit.idx : Math.max(...curvesPts.map((c) => c.length - 1));
    let revealed = 0;
    const step = () => {
      revealed = Math.min(revealed + PROJECTILE_POINTS_PER_FRAME, stopIndex + 1);
      setCurveData(
        curvesPts.map((c) => ({
          d: toPathD(c.slice(0, Math.min(revealed, c.length))),
          color: shooter.color,
          strokeWidth: 3,
        }))
      );
      if (revealed <= stopIndex) {
        animationRef.current = requestAnimationFrame(step);
        return;
      }
      if (hit) dispatch({ type: 'ELIMINATE', playerId: hit.hitId });
      if (move.itemId) dispatch({ type: 'USE_ITEM', playerId: move.playerId, itemId: move.itemId });
      dispatch({ type: 'NEXT_TURN' });
    };
    animationRef.current = requestAnimationFrame(step);
  }

  function playMoveMove(move) {
    dispatch({ type: 'MOVE', playerId: move.playerId, dx: move.moveTo.dx, dy: move.moveTo.dy, bounds: move.bounds });
    dispatch({ type: 'NEXT_TURN' });
  }

  // startRematch — bắt đầu ván mới TRONG CÙNG phòng (roomId/myPlayerId/opponentJoined giữ
  // nguyên, chỉ reset trạng thái ván đấu) — gọi ở CẢ HAI máy khi đã "đồng thuận" đấu lại
  // (bên mời gọi khi nhận 'rematch_accept', bên được mời gọi ngay khi tự bấm đồng ý). Hai máy
  // cùng gọi createInitialState(CANVAS_WIDTH, CANVAS_HEIGHT) như lúc vào phòng lần đầu — hàm
  // thuần/deterministic nên không cần đồng bộ thêm gì khác.
  function startRematch() {
    cancelAnimationFrame(animationRef.current);
    setCurveData(null);
    setError(null);
    setActiveItemId(null);
    setCaption(null);
    setRematchStatus('idle');
    dispatch({ type: 'RESET', width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  }

  function handleRemoteMessage(move) {
    if (move.playerId === myPlayerId) return; // tự vệ nếu backend echo lại chính mình
    if (move.type === 'join') {
      setOpponentJoined(true);
      return;
    }
    if (move.type === 'rematch_request') {
      setRematchStatus('invited');
      return;
    }
    if (move.type === 'rematch_accept') {
      startRematch();
      return;
    }
    if (move.type === 'fire') playFireMove(move);
    else if (move.type === 'move') playMoveMove(move);
  }

  // handleRemoteMessage đóng trên state/players/myPlayerId của LẦN RENDER hiện tại, nhưng
  // subscribeToRoom chỉ gọi onMove MỘT LẦN (lúc tạo/vào phòng) — adapter giữ mãi tham chiếu đó,
  // nếu truyền thẳng handleRemoteMessage sẽ luôn thấy state CŨ (đứng yên ở lượt đầu tiên) cho
  // mọi nước đi đến sau. Dùng ref để callback thật gọi luôn bản mới nhất mỗi lần render.
  const handleRemoteMessageRef = useRef(handleRemoteMessage);
  handleRemoteMessageRef.current = handleRemoteMessage;

  function subscribeToRoom(id) {
    unsubscribeRef.current = getAdapter().onMove(id, (move) => handleRemoteMessageRef.current(move));
  }

  const handleCreateRoom = async () => {
    try {
      setConnectError(null);
      const id = await getAdapter().createRoom();
      subscribeToRoom(id);
      setRoomId(id);
      setMyPlayerId('p1');
    } catch (e) {
      setConnectError(e.message);
    }
  };

  const handleJoinRoom = async () => {
    const id = joinCodeInput.trim().toUpperCase();
    if (!id) return;
    try {
      setConnectError(null);
      await getAdapter().joinRoom(id);
      subscribeToRoom(id);
      setRoomId(id);
      setMyPlayerId('p2');
      setOpponentJoined(true); // p2 vào sau nên chắc chắn p1 (chủ phòng) đã tồn tại
      await getAdapter().sendMove(id, { type: 'join', playerId: 'p2' });
    } catch (e) {
      setConnectError(e.message);
    }
  };

  const handleFire = (expr) => {
    if (!myTurn) return;
    try {
      const shooter = currentPlayer;
      const move = createFireMove({
        playerId: shooter.id,
        expr,
        angle: shooter.angle,
        itemId: activeItemId,
        bounds: { w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
      });
      setError(null);
      playFireMove(move);
      getAdapter().sendMove(roomId, move);
    } catch (e) {
      setCurveData(null);
      setError(`Biểu thức không hợp lệ: ${e.message}`);
    }
  };

  const handleAngleChange = (angle) => dispatch({ type: 'SET_ANGLE', playerId: currentPlayerId, angle });

  const handleMove = (cellsDx, cellsDy) => {
    if (!myTurn) return;
    const move = createMoveMove({
      playerId: currentPlayerId,
      dx: cellsDx * PIXELS_PER_UNIT,
      dy: cellsDy * PIXELS_PER_UNIT,
      bounds: { w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
    });
    playMoveMove(move);
    getAdapter().sendMove(roomId, move);
  };

  const handleItemToggle = (itemId) => setActiveItemId(itemId);

  // handleExit — thoát phòng sau khi ván kết thúc, quay về màn hình lobby (T11.2 mở rộng).
  // Chỉ dọn state CỤC BỘ của máy này (huỷ đăng ký onMove, reset roomId/state) — không có khái
  // niệm "rời phòng" phía server vì Realtime Broadcast không lưu phòng, đối thủ tự thấy mất kết
  // nối nếu họ vẫn đang đợi nước đi tiếp theo.
  const handleExit = () => {
    cancelAnimationFrame(animationRef.current);
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setRoomId(null);
    setMyPlayerId(null);
    setOpponentJoined(false);
    setJoinCodeInput('');
    setRematchStatus('idle');
    setCurveData(null);
    setError(null);
    setActiveItemId(null);
    setCaption(null);
    dispatch({ type: 'RESET', width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  };

  // handleInviteRematch — gửi lời mời đấu lại, CHƯA bắt đầu ván mới ngay (chỉ đổi trạng thái
  // UI sang "đã mời, đang chờ") — chỉ thật sự reset khi nhận 'rematch_accept' từ đối thủ.
  const handleInviteRematch = () => {
    setRematchStatus('requested');
    getAdapter().sendMove(roomId, { type: 'rematch_request', playerId: myPlayerId });
  };

  // handleAcceptRematch — đối thủ đã mời (rematchStatus === 'invited'), mình bấm đồng ý: báo
  // lại cho đối thủ BIẾT mình đã xác nhận rồi mới tự bắt đầu ván mới ở máy mình (startRematch).
  const handleAcceptRematch = () => {
    getAdapter().sendMove(roomId, { type: 'rematch_accept', playerId: myPlayerId });
    startRematch();
  };

  const aim = useMemo(() => {
    if (phase !== TURN_PHASE.AIMING) return null;
    const direction = shooterDirection(currentPlayer);
    const origin = { x: currentPlayer.x, y: currentPlayer.y };
    const [tip] = rotate([{ x: origin.x + direction * AIM_RAY_LENGTH, y: origin.y }], origin, currentPlayer.angle);
    return { x1: origin.x, y1: origin.y, x2: tip.x, y2: tip.y, color: currentPlayer.color };
  }, [phase, currentPlayer]);

  if (!roomId) {
    return (
      <View style={styles.lobby}>
        <Text style={styles.lobbyTitle}>Chơi online</Text>
        <TouchableOpacity style={styles.lobbyButton} onPress={handleCreateRoom}>
          <Text style={styles.lobbyButtonText}>Tạo phòng mới</Text>
        </TouchableOpacity>
        <Text style={styles.lobbyOr}>hoặc</Text>
        <TextInput
          style={styles.lobbyInput}
          value={joinCodeInput}
          onChangeText={setJoinCodeInput}
          placeholder="Nhập mã phòng"
          placeholderTextColor="#888"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.lobbyButton} onPress={handleJoinRoom}>
          <Text style={styles.lobbyButtonText}>Vào phòng</Text>
        </TouchableOpacity>
        {connectError ? <Text style={styles.lobbyError}>{connectError}</Text> : null}
      </View>
    );
  }

  if (!opponentJoined) {
    return (
      <View style={styles.lobby}>
        <Text style={styles.lobbyTitle}>Mã phòng: {roomId}</Text>
        <Text style={styles.lobbyOr}>Đang chờ người chơi thứ hai vào phòng…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GameCanvas
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        renderWidth={width}
        renderHeight={height}
        origin={gridOrigin}
        pixelsPerUnit={PIXELS_PER_UNIT}
        curves={curveData ?? []}
        players={players}
        terrain={state.terrain}
        aim={aim}
      />
      <TurnBar
        currentPlayer={currentPlayer}
        active={false}
        inputTimeSec={INPUT_TIME_SEC}
        onTimeout={() => {}}
      />
      <Text style={[styles.youLabel, { top: insets.top + 76 }]}>
        {myTurn ? 'Đến lượt bạn' : 'Chờ đối thủ…'}
      </Text>
      {caption ? <Text style={[styles.caption, { top: insets.top + 98 }]}>{caption}</Text> : null}
      <KeyboardAvoidingView style={styles.inputBar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ItemBag
          items={currentPlayer.items}
          activeItemId={activeItemId}
          disabled={!myTurn}
          onToggle={handleItemToggle}
        />
        <MoveControl maxCells={MAX_MOVE_CELLS} disabled={!myTurn} onMove={handleMove} />
        <AngleControl angle={currentPlayer.angle} step={ANGLE_STEP} disabled={!myTurn} onChange={handleAngleChange} />
        <EquationInput onFire={handleFire} error={error} rules={activeRules} disabled={!myTurn} />
      </KeyboardAvoidingView>
      {phase === TURN_PHASE.OVER ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{winner ? `${winner.label} thắng!` : 'Kết thúc'}</Text>
          {rematchStatus === 'invited' ? (
            <>
              <Text style={styles.rematchNote}>Đối thủ muốn đấu lại</Text>
              <TouchableOpacity style={styles.rematchButton} onPress={handleAcceptRematch}>
                <Text style={styles.overlayButtonText}>Đồng ý đấu lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.rematchButton, rematchStatus === 'requested' && styles.rematchButtonDisabled]}
              onPress={handleInviteRematch}
              disabled={rematchStatus === 'requested'}
            >
              <Text style={styles.overlayButtonText}>
                {rematchStatus === 'requested' ? 'Đã gửi lời mời…' : 'Mời đấu lại'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.overlayButton} onPress={handleExit}>
            <Text style={styles.overlayButtonText}>Thoát phòng</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  lobby: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lobbyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 24,
  },
  lobbyOr: {
    color: '#b0bec5',
    marginVertical: 12,
  },
  lobbyInput: {
    width: 200,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#222',
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  lobbyButton: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#00695c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  lobbyError: {
    color: '#ff8a80',
    marginTop: 16,
    textAlign: 'center',
  },
  youLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#80cbc4',
    fontSize: 13,
    fontWeight: '700',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#ffd54f',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  rematchNote: {
    marginTop: 24,
    color: '#b0bec5',
    fontSize: 14,
  },
  rematchButton: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#00695c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rematchButtonDisabled: {
    opacity: 0.5,
  },
  overlayButton: {
    marginTop: 12,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
