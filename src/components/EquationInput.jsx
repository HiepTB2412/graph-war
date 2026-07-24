import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// EquationInput — ô nhập biểu thức + nút "Bắn". Gọi onFire(expr) khi bấm, hiện error nếu có.
export default function EquationInput({ onFire, error }) {
  const [text, setText] = useState('');

  const handleFire = () => {
    const expr = text.trim();
    if (!expr) return;
    onFire(expr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="vd: x^2"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleFire}
        />
        <TouchableOpacity style={styles.button} onPress={handleFire}>
          <Text style={styles.buttonText}>Bắn</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#222',
    color: '#fff',
    fontSize: 16,
  },
  button: {
    marginLeft: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#ff8a80',
    marginTop: 6,
    fontSize: 13,
  },
});
