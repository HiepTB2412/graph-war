import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import GameCanvas from '../components/GameCanvas';
import EquationInput from '../components/EquationInput';
import { compileFunction } from '../engine/astGuard';
import { sampleCurve, toPathD } from '../engine/curve';
import { PIXELS_PER_UNIT, X_MAX, STEP, MAX_SLOPE } from '../config';
import { chaos as activeRules } from '../game/rules';
import { createPlayers } from '../game/gameState';

// GameScreen — Phase 4: đường cong xuất phát từ vị trí người đang tới lượt
// (P1 bên trái bắn sang phải, P2 bên phải bắn sang trái), cắt theo bounds/maxSlope (T4.3).
// Turn manager đầy đủ (timer, thắng/thua, reducer) làm ở Phase 6 — ở đây chỉ đổi lượt
// đơn giản sau mỗi phát bắn để có thể test hướng bắn của cả hai người.
export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const [players, setPlayers] = useState(() => createPlayers(width, height));
  const [currentPlayerId, setCurrentPlayerId] = useState('p1');
  const [curveData, setCurveData] = useState(null);
  const [error, setError] = useState(null);

  const gridOrigin = useMemo(() => ({ x: width / 2, y: height / 2 }), [width, height]);
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  const handleFire = (expr) => {
    try {
      const fn = compileFunction(expr);
      const shooter = currentPlayer;
      const direction = shooter.id === 'p1' ? 1 : -1;
      const pts = sampleCurve(fn, { x: shooter.x, y: shooter.y }, {
        pixelsPerUnit: PIXELS_PER_UNIT,
        direction,
        xMax: X_MAX,
        step: STEP,
        bounds: { w: width, h: height },
        maxSlope: MAX_SLOPE,
      });
      setCurveData({ d: toPathD(pts), color: shooter.color, strokeWidth: 3 });
      setError(null);
      setCurrentPlayerId((id) => (id === 'p1' ? 'p2' : 'p1'));
    } catch (e) {
      setCurveData(null);
      setError(`Biểu thức không hợp lệ: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <GameCanvas
        width={width}
        height={height}
        origin={gridOrigin}
        pixelsPerUnit={PIXELS_PER_UNIT}
        curves={curveData ? [curveData] : []}
        players={players}
      />
      <Text style={styles.turnLabel}>Lượt: {currentPlayer.label}</Text>
      <KeyboardAvoidingView
        style={styles.inputBar}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <EquationInput onFire={handleFire} error={error} rules={activeRules} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  turnLabel: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
  },
});
