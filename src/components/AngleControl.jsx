import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// AngleControl — chỉnh player.angle trước khi bắn bằng hai nút -/+ (T7.2, cơ chế 6).
// Disabled khi không ở phase 'aiming' (không cho đổi góc giữa lúc đạn đang bay/đã kết thúc).
// Việc kẹp góc trong [min, max] do gameReducer đảm nhiệm; component chỉ gửi delta lên.
export default function AngleControl({ angle, step, disabled, onChange }) {
  const adjust = (delta) => {
    if (disabled) return;
    onChange(angle + delta);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => adjust(-step)}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.angle}>Góc: {angle}°</Text>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => adjust(step)}
        disabled={disabled}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#222',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  angle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 16,
    minWidth: 72,
    textAlign: 'center',
  },
});
