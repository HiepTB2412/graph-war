import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { analyze } from '../engine/astGuard';

const DEBOUNCE_MS = 200;

// EquationInput — ô nhập biểu thức + nút "Bắn". Gọi onFire(expr) khi bấm, hiện error nếu có.
// Gõ tới đâu, chạy analyze(text, rules) (debounce) tới đó để hiện mana tiêu hao / lý do cấm
// và disable nút Bắn khi biểu thức không hợp lệ (T3.8).
export default function EquationInput({ onFire, error, rules, disabled = false }) {
  const [text, setText] = useState('');
  const [check, setCheck] = useState({ ok: true, reason: '', mana: 0 });

  useEffect(() => {
    const expr = text.trim();
    if (!expr) {
      setCheck({ ok: true, reason: '', mana: 0 });
      return;
    }
    const timer = setTimeout(() => setCheck(analyze(expr, rules)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, rules]);

  const canFire = text.trim().length > 0 && check.ok && !disabled;

  const handleFire = () => {
    const expr = text.trim();
    if (!expr || !check.ok || disabled) return;
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
          editable={!disabled}
          onSubmitEditing={handleFire}
        />
        <TouchableOpacity
          style={[styles.button, !canFire && styles.buttonDisabled]}
          onPress={handleFire}
          disabled={!canFire}
        >
          <Text style={styles.buttonText}>Bắn</Text>
        </TouchableOpacity>
      </View>
      {text.trim() ? (
        <Text style={check.ok ? styles.mana : styles.error}>
          {check.ok ? `Mana ${check.mana}/${rules.maxMana}` : check.reason}
        </Text>
      ) : null}
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
  buttonDisabled: {
    backgroundColor: '#5c2422',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  mana: {
    color: '#80cbc4',
    marginTop: 6,
    fontSize: 13,
  },
  error: {
    color: '#ff8a80',
    marginTop: 6,
    fontSize: 13,
  },
});
