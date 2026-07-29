import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
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
import MapSelect from '../components/MapSelect';
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

// GameScreen — Phase 4: đường cong xuất phát từ vị trí người đang tới lượt
// (P1 bên trái bắn sang phải, P2 bên phải bắn sang trái), cắt theo bounds/maxSlope (T4.3).
// Phase 5: đường cong được vẽ dần điểm-theo-điểm ("đạn bay", T5.3); checkCollision chạy
// theo tiến trình vẽ nên phát bắn dừng đúng tại điểm trúng thay vì hiện cả đường rồi mới
// báo trúng (T5.2). Phase 6: turn manager đầy đủ qua gameReducer — phase aiming→firing→over,
// timer nhập (TurnBar) tự mất lượt khi hết giờ, và overlay thắng/thua với nút chơi lại.
// Phase 8: mỗi lượt chọn HOẶC di chuyển (MoveControl, T8.1) HOẶC bắn — cả hai đều tự
// NEXT_TURN nên chỉ hành động nào bấm trước mới có tác dụng. Vật phẩm đang chọn (activeItemId)
// áp vào phát bắn kế qua point pipeline (items.js, T8.2/T8.3) rồi bị tiêu hao.
// Phase 10: Chế độ học (cơ chế 9, T10.1) — sau mỗi phát bắn hợp lệ, hiện chú thích dạng hàm
// suy ra từ analyze() (không chặn tiến độ, chỉ mô tả song song).
// Phase 11 (multiplayer, tuỳ chọn): mỗi phát bắn/di chuyển được gói thành một "nước đi"
// (game/moves.js createFireMove/createMoveMove) trước khi áp dụng — cùng object này gửi qua
// mạng để máy khác tự dựng lại kết quả bằng resolveFireMove/applyMove (chưa nối adapter thật,
// xem src/network/).
export default function GameScreen() {
  // width/height = kích thước THẬT màn hình máy này, chỉ dùng để HIỂN THỊ (GameCanvas
  // renderWidth/renderHeight) — mọi tính toán vật lý/state (vị trí người chơi, địa hình,
  // tầm bắn) dùng CANVAS_WIDTH/HEIGHT cố định bên dưới. Trên màn hình rộng (web/tablet),
  // dùng width thật cho vị trí người chơi trong khi tầm bắn (X_MAX*PIXELS_PER_UNIT) là số
  // pixel CỐ ĐỊNH sẽ khiến khoảng cách hai người chơi giãn theo % màn hình còn tầm bắn thì
  // không đổi → đường cong hụt, không tới được đối phương trên màn hình rộng.
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(CANVAS_WIDTH, CANVAS_HEIGHT)
  );
  const [curveData, setCurveData] = useState(null);
  const [error, setError] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [caption, setCaption] = useState(null);
  const animationRef = useRef(null);

  useEffect(() => () => cancelAnimationFrame(animationRef.current), []);
  useEffect(() => setActiveItemId(null), [state.currentPlayerId]);

  const gridOrigin = useMemo(() => ({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }), []);
  const { players, currentPlayerId, phase, winnerId } = state;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const winner = players.find((p) => p.id === winnerId);

  // Tia ngắm mờ (T7.2): điểm nằm ngang cách người bắn AIM_RAY_LENGTH theo hướng bắn,
  // xoay quanh vị trí người bắn bằng player.angle — cùng công thức sẽ áp cho cả đường cong
  // thật (T7.3), nên tia ngắm luôn khớp với hướng đạn sắp bay.
  const aim = useMemo(() => {
    if (phase !== TURN_PHASE.AIMING) return null;
    const direction = shooterDirection(currentPlayer);
    const origin = { x: currentPlayer.x, y: currentPlayer.y };
    const [tip] = rotate(
      [{ x: origin.x + direction * AIM_RAY_LENGTH, y: origin.y }],
      origin,
      currentPlayer.angle
    );
    return { x1: origin.x, y1: origin.y, x2: tip.x, y2: tip.y, color: currentPlayer.color };
  }, [phase, currentPlayer]);

  const handleFire = (expr) => {
    if (phase !== TURN_PHASE.AIMING) return;
    try {
      const shooter = currentPlayer;
      // Nước đi (Phase 11): gói mọi tham số cần để dựng lại ĐÚNG kết quả này ở máy khác —
      // resolveFireMove là logic thuần dùng chung cho cả bắn cục bộ (ở đây) lẫn tái dựng từ
      // nước đi nhận qua mạng (game/moves.js).
      const move = createFireMove({
        playerId: shooter.id,
        expr,
        angle: shooter.angle,
        itemId: activeItemId,
        bounds: { w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
      });
      const { curvesPts, hit } = resolveFireMove(state, move);

      // Chế độ học (T10.1): nhãn dạng hàm không phụ thuộc kết quả trúng/trượt, hiện ngay
      // khi bắn — dùng lại đúng {degree, fnNames} analyze() đã tính, không parse lại lần hai.
      setCaption(`Đây là ${classifyAnalysis(analyze(expr, activeRules))}`);
      setError(null);
      cancelAnimationFrame(animationRef.current);
      dispatch({ type: 'FIRE' });

      // Nhiều đường cong (item "double") tiến triển đồng thời theo cùng chỉ số điểm;
      // ai trúng trước (chỉ số nhỏ hơn) thắng phát này. Không ai trúng → dừng khi đường
      // cong dài nhất vẽ xong (đường ngắn hơn tự dừng nhờ Math.min khi slice).
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
        if (hit) {
          dispatch({ type: 'ELIMINATE', playerId: hit.hitId });
        }
        if (activeItemId) {
          dispatch({ type: 'USE_ITEM', playerId: shooter.id, itemId: activeItemId });
          setActiveItemId(null);
        }
        dispatch({ type: 'NEXT_TURN' });
        // (Phase 11) khi có network adapter thật: networkAdapter.sendMove(roomId, move) ở đây.
      };
      animationRef.current = requestAnimationFrame(step);
    } catch (e) {
      setCurveData(null);
      setError(`Biểu thức không hợp lệ: ${e.message}`);
    }
  };

  const handleTimeout = () => dispatch({ type: 'NEXT_TURN' });

  const handleAngleChange = (angle) =>
    dispatch({ type: 'SET_ANGLE', playerId: currentPlayerId, angle });

  // Di chuyển (cơ chế 3, T8.1): dx/dy tới đây là số Ô (từ MoveControl); quy đổi ra pixel
  // rồi hết lượt ngay — di chuyển và bắn là hai lựa chọn loại trừ nhau trong một lượt.
  // Cũng gói thành move (Phase 11) như handleFire, cùng lý do: object này là thứ gửi qua
  // mạng để máy khác tái dựng lại (applyMove trong game/moves.js).
  const handleMove = (cellsDx, cellsDy) => {
    if (phase !== TURN_PHASE.AIMING) return;
    const move = createMoveMove({
      playerId: currentPlayerId,
      dx: cellsDx * PIXELS_PER_UNIT,
      dy: cellsDy * PIXELS_PER_UNIT,
      bounds: { w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
    });
    dispatch({ type: 'MOVE', playerId: move.playerId, dx: move.moveTo.dx, dy: move.moveTo.dy, bounds: move.bounds });
    dispatch({ type: 'NEXT_TURN' });
    // (Phase 11) khi có network adapter thật: networkAdapter.sendMove(roomId, move) ở đây.
  };

  const handleItemToggle = (itemId) => setActiveItemId(itemId);

  const resetMatch = (mapId) => {
    cancelAnimationFrame(animationRef.current);
    setCurveData(null);
    setError(null);
    setActiveItemId(null);
    setCaption(null);
    dispatch({ type: 'RESET', width: CANVAS_WIDTH, height: CANVAS_HEIGHT, mapId });
  };

  const handleRestart = () => resetMatch(undefined);

  // handleMapChange — đổi bản đồ (MapSelect) coi như bắt đầu ván mới với địa hình mới;
  // resetMatch dùng lại đúng logic dọn state cục bộ như "Chơi lại" (T9.1).
  const handleMapChange = (mapId) => resetMatch(mapId);

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
        active={phase === TURN_PHASE.AIMING}
        inputTimeSec={INPUT_TIME_SEC}
        onTimeout={handleTimeout}
      />
      <MapSelect mapId={state.mapId} disabled={phase === TURN_PHASE.FIRING} onSelect={handleMapChange} />
      {caption ? <Text style={[styles.caption, { top: insets.top + 76 }]}>{caption}</Text> : null}
      <KeyboardAvoidingView
        style={styles.inputBar}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ItemBag
          items={currentPlayer.items}
          activeItemId={activeItemId}
          disabled={phase !== TURN_PHASE.AIMING}
          onToggle={handleItemToggle}
        />
        <MoveControl
          maxCells={MAX_MOVE_CELLS}
          disabled={phase !== TURN_PHASE.AIMING}
          onMove={handleMove}
        />
        <AngleControl
          angle={currentPlayer.angle}
          step={ANGLE_STEP}
          disabled={phase !== TURN_PHASE.AIMING}
          onChange={handleAngleChange}
        />
        <EquationInput
          onFire={handleFire}
          error={error}
          rules={activeRules}
          disabled={phase !== TURN_PHASE.AIMING}
        />
      </KeyboardAvoidingView>
      {phase === TURN_PHASE.OVER ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{winner ? `${winner.label} thắng!` : 'Kết thúc'}</Text>
          <TouchableOpacity style={styles.overlayButton} onPress={handleRestart}>
            <Text style={styles.overlayButtonText}>Chơi lại</Text>
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
    marginBottom: 24,
  },
  overlayButton: {
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
