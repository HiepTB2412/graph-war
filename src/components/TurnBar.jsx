import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TurnBar — hiện người tới lượt + đếm ngược inputTimeSec (T6.4). Đếm lại từ đầu mỗi khi
// currentPlayer đổi; khi `active` (phase === 'aiming') và hết giờ mà chưa bắn → onTimeout()
// một lần duy nhất để engine tự NEXT_TURN (mất lượt). Không đếm khi !active (đang firing/over).
// Vị trí cộng thêm insets.top (vùng an toàn — tai thỏ/Dynamic Island) + khoảng hở cho thanh
// chuyển chế độ ở App.js, để không bị che trên các máy có tai thỏ.
export default function TurnBar({ currentPlayer, active, inputTimeSec, onTimeout }) {
  const insets = useSafeAreaInsets();
  const [secondsLeft, setSecondsLeft] = useState(inputTimeSec);
  const firedRef = useRef(false);

  useEffect(() => {
    setSecondsLeft(inputTimeSec);
    firedRef.current = false;
  }, [currentPlayer.id, inputTimeSec]);

  useEffect(() => {
    if (!active) return undefined;
    if (secondsLeft <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onTimeout();
      }
      return undefined;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [active, secondsLeft, onTimeout]);

  return (
    <View style={[styles.container, { top: insets.top + 48 }]}>
      <Text style={styles.label}>Lượt: {currentPlayer.label}</Text>
      <Text style={[styles.timer, secondsLeft <= 3 && styles.timerWarn]}>{secondsLeft}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  timer: {
    color: '#80cbc4',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  timerWarn: {
    color: '#ff8a80',
  },
});
