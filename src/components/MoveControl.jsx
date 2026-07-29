import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 8 hướng la bàn quanh ô trung tâm (ô giữa để trống cho cân đối lưới 3x3).
const DIRECTIONS = [
  { key: 'nw', label: '↖', dx: -1, dy: -1 },
  { key: 'n', label: '↑', dx: 0, dy: -1 },
  { key: 'ne', label: '↗', dx: 1, dy: -1 },
  { key: 'w', label: '←', dx: -1, dy: 0 },
  { key: null, label: '', dx: 0, dy: 0 },
  { key: 'e', label: '→', dx: 1, dy: 0 },
  { key: 'sw', label: '↙', dx: -1, dy: 1 },
  { key: 's', label: '↓', dx: 0, dy: 1 },
  { key: 'se', label: '↘', dx: 1, dy: 1 },
];

// MoveControl — di chuyển (cơ chế 3, T8.1): chọn số ô (≤ maxCells) rồi bấm hướng để di
// chuyển ngay và hết lượt (không cần nút xác nhận riêng — bấm hướng = hành động "di chuyển"
// tương tự bấm "Bắn"). Lưới rời rạc: onMove nhận (dx, dy) tính theo ĐƠN VỊ Ô, GameScreen
// tự quy đổi ra pixel bằng PIXELS_PER_UNIT.
export default function MoveControl({ maxCells, disabled, onMove }) {
  const [cells, setCells] = useState(maxCells);

  return (
    <View style={styles.container}>
      <View style={styles.distanceRow}>
        {Array.from({ length: maxCells }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.distanceButton, cells === n && styles.distanceButtonActive]}
            onPress={() => setCells(n)}
            disabled={disabled}
          >
            <Text style={styles.distanceText}>{n} ô</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.pad}>
        {DIRECTIONS.map((d) =>
          d.key ? (
            <TouchableOpacity
              key={d.key}
              style={[styles.dirButton, disabled && styles.dirButtonDisabled]}
              disabled={disabled}
              onPress={() => onMove(d.dx * cells, d.dy * cells)}
            >
              <Text style={styles.dirText}>{d.label}</Text>
            </TouchableOpacity>
          ) : (
            <View key="center" style={styles.dirButton} />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  distanceButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#263238',
    marginHorizontal: 4,
  },
  distanceButtonActive: {
    backgroundColor: '#00695c',
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pad: {
    width: 36 * 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dirButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 4,
    margin: 1,
  },
  dirButtonDisabled: {
    backgroundColor: '#222',
  },
  dirText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
