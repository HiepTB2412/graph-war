import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import GameCanvas from '../components/GameCanvas';
import EquationInput from '../components/EquationInput';
import { compileFunction } from '../engine/astGuard';
import { sampleCurve, toPathD } from '../engine/curve';
import { PIXELS_PER_UNIT, X_MAX, STEP } from '../config';

// GameScreen — Phase 2: nhập hàm bất kỳ → compile → sample → vẽ động lên canvas.
export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const [curveData, setCurveData] = useState(null);
  const [error, setError] = useState(null);

  const origin = useMemo(() => ({ x: width / 2, y: height / 2 }), [width, height]);
  const xMax = useMemo(() => Math.min(X_MAX, (width / 2 - 10) / PIXELS_PER_UNIT), [width]);

  const handleFire = (expr) => {
    try {
      const fn = compileFunction(expr);
      const pts = sampleCurve(fn, origin, {
        pixelsPerUnit: PIXELS_PER_UNIT,
        direction: 1,
        xMax,
        step: STEP,
      });
      setCurveData({ d: toPathD(pts), color: '#4dd0e1', strokeWidth: 3 });
      setError(null);
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
        origin={origin}
        pixelsPerUnit={PIXELS_PER_UNIT}
        curves={curveData ? [curveData] : []}
      />
      <KeyboardAvoidingView
        style={styles.inputBar}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <EquationInput onFire={handleFire} error={error} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
  },
});
