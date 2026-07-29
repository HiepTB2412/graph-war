import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameCanvas from '../components/GameCanvas';
import EquationInput from '../components/EquationInput';
import { analyze, compileFunction } from '../engine/astGuard';
import { classifyAnalysis } from '../engine/classify';
import { sampleCurve, toPathD } from '../engine/curve';
import { checkCollision } from '../engine/collision';
import { PIXELS_PER_UNIT, X_MAX, STEP, MAX_SLOPE, PLAYER_RADIUS, PROJECTILE_POINTS_PER_FRAME } from '../config';
import { practice as practiceRules } from '../game/rules';

const BEGINNER_TIPS = [
  'Hàm bậc nhất như "2*x" vẽ một đường thẳng — hệ số càng lớn, đường càng dốc.',
  'Hàm bậc 2 như "x^2" vẽ một parabol mở lên trên; thử "-x^2" để lật ngược xuống dưới.',
  'sin(x) và cos(x) vẽ các đường sóng lặp lại — đổi hệ số nhân với x để sóng nhanh/chậm hơn.',
  'sqrt(x) chỉ có nghĩa với x ≥ 0 — đồ thị bắt đầu từ gốc và tăng chậm dần.',
  'Cộng thêm một số (vd "x^2+3") đẩy cả đồ thị lên trên đúng bằng số đó.',
];

function randomTargetPosition(width, height) {
  return {
    x: width * (0.55 + Math.random() * 0.35),
    y: height * (0.2 + Math.random() * 0.55),
  };
}

// PracticeScreen — Chế độ học PvE (cơ chế 9, T10.2): bắn vào một bia cố định, không giới
// hạn mana/thời gian/đối thủ — chỉ tập trung vào việc hình dung hình dạng đồ thị. Chạy hoàn
// toàn tách biệt với GameScreen (PvP), tự quản lý state cục bộ, không dùng gameReducer vì
// không có khái niệm lượt/thắng-thua ở đây. Dùng lại đúng engine thuần (astGuard/curve/
// collision/classify) như GameScreen để không lặp logic.
export default function PracticeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shooter = { id: 'you', x: width * 0.12, y: height / 2, radius: PLAYER_RADIUS, color: '#4dd0e1', label: 'Bạn' };

  const [target, setTarget] = useState(() => ({
    id: 'target',
    ...randomTargetPosition(width, height),
    radius: PLAYER_RADIUS,
    color: '#ffca28',
    label: 'Bia',
    eliminated: false,
  }));
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firing, setFiring] = useState(false);
  const [curveData, setCurveData] = useState(null);
  const [caption, setCaption] = useState(null);
  const [hint, setHint] = useState(BEGINNER_TIPS[0]);
  const [error, setError] = useState(null);
  const animationRef = useRef(null);

  useEffect(() => () => cancelAnimationFrame(animationRef.current), []);

  const handleFire = (expr) => {
    if (firing) return;
    try {
      const fn = compileFunction(expr);
      setCaption(`Đây là ${classifyAnalysis(analyze(expr, practiceRules))}`);
      setError(null);

      const pts = sampleCurve(fn, { x: shooter.x, y: shooter.y }, {
        pixelsPerUnit: PIXELS_PER_UNIT,
        direction: 1,
        xMax: X_MAX,
        step: STEP,
        bounds: { w: width, h: height },
        maxSlope: MAX_SLOPE,
      });

      cancelAnimationFrame(animationRef.current);
      setFiring(true);

      const hit = checkCollision(pts, [target], shooter.id);
      const stopIndex = hit ? pts.indexOf(hit.at) : pts.length - 1;

      let revealed = 0;
      const step = () => {
        revealed = Math.min(revealed + PROJECTILE_POINTS_PER_FRAME, stopIndex + 1);
        setCurveData({ d: toPathD(pts.slice(0, revealed)), color: shooter.color, strokeWidth: 3 });
        if (revealed <= stopIndex) {
          animationRef.current = requestAnimationFrame(step);
          return;
        }
        setAttempts((n) => n + 1);
        if (hit) {
          setScore((s) => s + 1);
          setHint('Trúng bia! Bia vừa đổi chỗ, thử tiếp một dạng hàm khác xem sao.');
          setTarget((t) => ({ ...t, ...randomTargetPosition(width, height) }));
        } else {
          setHint((prevHint) => {
            const idx = BEGINNER_TIPS.indexOf(prevHint);
            return BEGINNER_TIPS[(idx + 1) % BEGINNER_TIPS.length];
          });
        }
        setFiring(false);
      };
      animationRef.current = requestAnimationFrame(step);
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
        origin={{ x: width / 2, y: height / 2 }}
        pixelsPerUnit={PIXELS_PER_UNIT}
        curves={curveData ? [curveData] : []}
        players={[shooter, target]}
      />
      <Text style={[styles.scoreLabel, { top: insets.top + 48 }]}>Trúng: {score} / {attempts} lượt</Text>
      {caption ? (
        <Text style={[styles.caption, { top: insets.top + 76 }]}>{caption}</Text>
      ) : null}
      <Text style={[styles.hint, { top: insets.top + 100 }]}>💡 {hint}</Text>
      <KeyboardAvoidingView
        style={styles.inputBar}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <EquationInput onFire={handleFire} error={error} rules={practiceRules} disabled={firing} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scoreLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
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
  hint: {
    position: 'absolute',
    left: 16,
    right: 16,
    textAlign: 'center',
    color: '#b0bec5',
    fontSize: 12,
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
  },
});
